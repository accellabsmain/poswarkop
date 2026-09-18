-- ==============================================================================
-- Migration: Phase 3 — Multi-Store Inventory & Inter-Store Stock Transfer
-- Author: Lintang (Backend & Database Engineer)
-- Tasks:
-- 1. Task 3.1: Stored Procedure / RPC Function transfer_store_stock()
-- 2. Task 3.2: Stock Movement Logging Engine (TRANSFER_OUT & TRANSFER_IN)
-- 3. Task 3.3: Low Stock Threshold Query Function (get_low_stock_products)
-- ==============================================================================

-- ==============================================================================
-- 1. TABLE DEFINITIONS: stock_transfers & stock_transfer_items
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT NOT NULL UNIQUE,
    from_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    to_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_different_stores CHECK (from_store_id <> to_store_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    transfer_price NUMERIC(12, 2) DEFAULT 0 CHECK (transfer_price >= 0)
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_store ON public.stock_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_store ON public.stock_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON public.stock_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON public.stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_product ON public.stock_transfer_items(product_id);

-- Enable RLS
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_transfers
DROP POLICY IF EXISTS stock_transfers_select ON public.stock_transfers;
CREATE POLICY stock_transfers_select ON public.stock_transfers
    FOR SELECT
    TO authenticated
    USING (
        public.user_has_store_access(from_store_id)
        OR public.user_has_store_access(to_store_id)
        OR public.auth_user_role() = 'owner'
    );

DROP POLICY IF EXISTS stock_transfers_insert ON public.stock_transfers;
CREATE POLICY stock_transfers_insert ON public.stock_transfers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.user_has_store_access(from_store_id) AND public.auth_user_role() IN ('owner', 'manager'))
        OR public.auth_user_role() = 'owner'
    );

-- RLS Policies for stock_transfer_items
DROP POLICY IF EXISTS stock_transfer_items_select ON public.stock_transfer_items;
CREATE POLICY stock_transfer_items_select ON public.stock_transfer_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stock_transfers t
            WHERE t.id = transfer_id
            AND (
                public.user_has_store_access(t.from_store_id)
                OR public.user_has_store_access(t.to_store_id)
                OR public.auth_user_role() = 'owner'
            )
        )
    );

DROP POLICY IF EXISTS stock_transfer_items_insert ON public.stock_transfer_items;
CREATE POLICY stock_transfer_items_insert ON public.stock_transfer_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stock_transfers t
            WHERE t.id = transfer_id
            AND (
                (public.user_has_store_access(t.from_store_id) AND public.auth_user_role() IN ('owner', 'manager'))
                OR public.auth_user_role() = 'owner'
            )
        )
    );

-- ==============================================================================
-- 2. TASK 3.1 & 3.2: ATOMIC RPC FUNCTION transfer_store_stock()
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.transfer_store_stock(
    p_from_store_id UUID,
    p_to_store_id UUID,
    p_product_id UUID,
    p_quantity INT,
    p_transfer_price NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_stock INT := 0;
    v_new_source_stock INT;
    v_new_dest_stock INT;
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_from_store_name TEXT;
    v_to_store_name TEXT;
    v_product_name TEXT;
    v_default_price NUMERIC;
BEGIN
    -- 1. Validasi Dasar
    IF p_from_store_id = p_to_store_id THEN
        RAISE EXCEPTION 'Toko asal dan toko tujuan transfer tidak boleh sama.';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Jumlah stok yang ditransfer harus lebih dari 0.';
    END IF;

    -- Tentukan user_id (dari parameter atau auth.uid)
    v_user_id := COALESCE(p_user_id, auth.uid());

    -- 2. Verifikasi Data Toko & Produk
    SELECT name INTO v_from_store_name FROM public.stores WHERE id = p_from_store_id;
    IF v_from_store_name IS NULL THEN
        RAISE EXCEPTION 'Toko asal (from_store_id) tidak ditemukan.';
    END IF;

    SELECT name INTO v_to_store_name FROM public.stores WHERE id = p_to_store_id;
    IF v_to_store_name IS NULL THEN
        RAISE EXCEPTION 'Toko tujuan (to_store_id) tidak ditemukan.';
    END IF;

    SELECT name, purchase_price INTO v_product_name, v_default_price
    FROM public.products
    WHERE id = p_product_id;
    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Produk tidak ditemukan.';
    END IF;

    -- Gunakan default harga beli jika transfer_price tidak diisi
    IF p_transfer_price IS NULL OR p_transfer_price = 0 THEN
        p_transfer_price := COALESCE(v_default_price, 0);
    END IF;

    -- 3. Row-Locking pada Toko Asal (Cek Stok dan Kunci Baris)
    SELECT COALESCE(quantity, 0) INTO v_current_stock
    FROM public.inventory
    WHERE store_id = p_from_store_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stok tidak mencukupi di %. Stok saat ini: %, diminta: %.',
            v_from_store_name, COALESCE(v_current_stock, 0), p_quantity;
    END IF;

    -- 4. Buat Nomor Dokumen Transfer Unik
    v_transfer_number := 'TRF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 6));

    -- Buat Record Transfer Header
    INSERT INTO public.stock_transfers (
        transfer_number,
        from_store_id,
        to_store_id,
        user_id,
        notes,
        created_at
    ) VALUES (
        v_transfer_number,
        p_from_store_id,
        p_to_store_id,
        v_user_id,
        p_notes,
        now()
    ) RETURNING id INTO v_transfer_id;

    -- Buat Record Transfer Item
    INSERT INTO public.stock_transfer_items (
        transfer_id,
        product_id,
        quantity,
        transfer_price
    ) VALUES (
        v_transfer_id,
        p_product_id,
        p_quantity,
        p_transfer_price
    );

    -- 5. Mutasi Inventaris (Atomic Update)
    -- Kurangi stok toko asal
    v_new_source_stock := v_current_stock - p_quantity;
    UPDATE public.inventory
    SET quantity = v_new_source_stock,
        updated_at = now()
    WHERE store_id = p_from_store_id AND product_id = p_product_id;

    -- Tambah stok toko tujuan (Upsert)
    INSERT INTO public.inventory (store_id, product_id, quantity, updated_at)
    VALUES (p_to_store_id, p_product_id, p_quantity, now())
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET
        quantity = public.inventory.quantity + EXCLUDED.quantity,
        updated_at = now()
    RETURNING quantity INTO v_new_dest_stock;

    -- 6. TASK 3.2: CATAT 2 LOG ENTRI KE stock_movements
    -- Log 1: TRANSFER_OUT di Toko Asal (-quantity)
    INSERT INTO public.stock_movements (
        product_id,
        store_id,
        type,
        quantity,
        reference_id,
        notes,
        user_id,
        created_at
    ) VALUES (
        p_product_id,
        p_from_store_id,
        'TRANSFER_OUT',
        -p_quantity,
        v_transfer_id,
        COALESCE(p_notes, 'Transfer ke ' || v_to_store_name || ' (' || v_transfer_number || ')'),
        v_user_id,
        now()
    );

    -- Log 2: TRANSFER_IN di Toko Tujuan (+quantity)
    INSERT INTO public.stock_movements (
        product_id,
        store_id,
        type,
        quantity,
        reference_id,
        notes,
        user_id,
        created_at
    ) VALUES (
        p_product_id,
        p_to_store_id,
        'TRANSFER_IN',
        p_quantity,
        v_transfer_id,
        COALESCE(p_notes, 'Transfer masuk dari ' || v_from_store_name || ' (' || v_transfer_number || ')'),
        v_user_id,
        now()
    );

    -- 7. Return Hasil Transaksi
    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_number,
        'product_id', p_product_id,
        'product_name', v_product_name,
        'quantity', p_quantity,
        'from_store', jsonb_build_object('id', p_from_store_id, 'name', v_from_store_name, 'remaining_stock', v_new_source_stock),
        'to_store', jsonb_build_object('id', p_to_store_id, 'name', v_to_store_name, 'new_stock', v_new_dest_stock),
        'created_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 3. TASK 3.3: LOW STOCK THRESHOLD QUERY FUNCTION & VIEW
-- ==============================================================================

-- Fungsi RPC untuk mengambil produk dengan stok di bawah atau sama dengan minimum_stock per toko
CREATE OR REPLACE FUNCTION public.get_low_stock_products(
    p_store_id UUID
) RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    barcode TEXT,
    category_id UUID,
    category_name TEXT,
    unit TEXT,
    selling_price NUMERIC,
    current_stock INT,
    minimum_stock INT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        p.unit,
        p.selling_price,
        COALESCE(inv.quantity, 0) AS current_stock,
        p.minimum_stock,
        CASE
            WHEN COALESCE(inv.quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
            ELSE 'LOW_STOCK'
        END AS status
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    INNER JOIN public.inventory inv ON inv.product_id = p.id AND inv.store_id = p_store_id
    WHERE p.is_active = true
      AND inv.quantity <= p.minimum_stock
    ORDER BY
        (COALESCE(inv.quantity, 0) <= 0) DESC, -- Stok habis tampil paling atas
        inv.quantity ASC,
        p.name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- View agregasi alert stok menipis lintas semua toko (khusus Owner & Dashboard Analytics)
CREATE OR REPLACE VIEW public.view_low_stock_alerts AS
SELECT
    s.id AS store_id,
    s.name AS store_name,
    s.code AS store_code,
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    p.unit,
    inv.quantity AS current_stock,
    p.minimum_stock,
    CASE
        WHEN inv.quantity <= 0 THEN 'OUT_OF_STOCK'
        ELSE 'LOW_STOCK'
    END AS status
FROM public.inventory inv
JOIN public.stores s ON s.id = inv.store_id
JOIN public.products p ON p.id = inv.product_id
LEFT JOIN public.categories c ON c.id = p.category_id
WHERE p.is_active = true
  AND inv.quantity <= p.minimum_stock
ORDER BY s.name, inv.quantity ASC;
