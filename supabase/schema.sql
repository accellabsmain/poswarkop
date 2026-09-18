-- ==========================================
-- POS WARKOP - Database Schema & RLS Script
-- ==========================================

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('owner', 'cashier', 'manager');
CREATE TYPE payment_method AS ENUM ('CASH', 'QRIS', 'TRANSFER', 'OTHER');
CREATE TYPE sale_status AS ENUM ('COMPLETED', 'CANCELLED', 'PENDING');
CREATE TYPE stock_movement_type AS ENUM ('PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- 2. Create Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default 3 Stores
INSERT INTO stores (name, code, address, phone) VALUES
('Toko Mas Budi', 'MAS_BUDI', 'Jl. Sembako Raya No. 1', '081234567890'),
('Warkop Ngombeku', 'NGOMBEKU', 'Jl. Pemuda No. 12', '081234567891'),
('Warkop Kakak', 'KAKAK', 'Jl. Merdeka No. 45', '081234567892')
ON CONFLICT (code) DO NOTHING;

-- 3. Create Profiles Table (Tied to Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. User Stores (Store Access Mapping)
CREATE TABLE IF NOT EXISTS user_stores (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, store_id)
);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Categories
INSERT INTO categories (name, slug) VALUES
('Sembako', 'sembako'),
('Minuman', 'minuman'),
('Makanan & Snack', 'makanan-snack'),
('Rokok', 'rokok'),
('Lainnya', 'lainnya')
ON CONFLICT (slug) DO NOTHING;

-- 6. Products Table (Global Master Data)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit TEXT DEFAULT 'pcs',
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Store-Specific Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (store_id, product_id)
);

-- 8. Stock Movements Table (Audit Trail of Stock Changes)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    type stock_movement_type NOT NULL,
    quantity INT NOT NULL,
    reference_id UUID,
    notes TEXT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT NOT NULL UNIQUE,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    cashier_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method payment_method NOT NULL,
    status sale_status NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Sale Items Table (Preserving Historical Sale Price!)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0),
    amount_change NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_change >= 0),
    payment_status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Stock Transfers Table (Phase 3: Inter-Store Stock Movement)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT NOT NULL UNIQUE,
    from_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    to_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_different_stores CHECK (from_store_id <> to_store_id)
);

-- 14. Stock Transfer Items Table
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    transfer_price NUMERIC(12, 2) DEFAULT 0 CHECK (transfer_price >= 0)
);

-- ==========================================
-- ATOMIC DATABASE FUNCTIONS
-- ==========================================

-- Function for Atomic Sale Processing
CREATE OR REPLACE FUNCTION process_sale_transaction(
    p_store_id UUID,
    p_cashier_id UUID,
    p_payment_method payment_method,
    p_amount_paid NUMERIC,
    p_items JSONB -- Array of { product_id, quantity, unit_price }
) RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_transaction_number TEXT;
    v_total_amount NUMERIC := 0;
    v_item RECORD;
    v_curr_stock INT;
    v_product_name TEXT;
    v_change NUMERIC;
BEGIN
    -- 1. Generate unique transaction number TRX-YYYYMMDD-HHMMSS-RAND
    v_transaction_number := 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(random() * 1000)::text, 3, '0');

    -- 2. Validate Cart & Calculate Total Amount while checking stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        -- Fetch Product Name & Current Store Stock
        SELECT p.name, COALESCE(i.quantity, 0) INTO v_product_name, v_curr_stock
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id AND i.store_id = p_store_id
        WHERE p.id = v_item.product_id;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Produk tidak ditemukan';
        END IF;

        IF v_curr_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Stok untuk produk "%" tidak mencukupi (Tersedia: %, Diminta: %)', v_product_name, v_curr_stock, v_item.quantity;
        END IF;

        v_total_amount := v_total_amount + (v_item.unit_price * v_item.quantity);
    END LOOP;

    -- Validate Payment for CASH
    IF p_payment_method = 'CASH' AND p_amount_paid < v_total_amount THEN
        RAISE EXCEPTION 'Uang pembayaran (Rp %) kurang dari total transaksi (Rp %)', p_amount_paid, v_total_amount;
    END IF;

    v_change := GREATEST(0, p_amount_paid - v_total_amount);

    -- 3. Create Sale Record
    INSERT INTO sales (transaction_number, store_id, cashier_id, total_amount, payment_method, status)
    VALUES (v_transaction_number, p_store_id, p_cashier_id, v_total_amount, p_payment_method, 'COMPLETED')
    RETURNING id INTO v_sale_id;

    -- 4. Create Sale Items, Deduct Inventory, Record Movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        -- Insert sale item with historical unit_price
        INSERT INTO sale_items (sale_id, product_id, unit_price, quantity, subtotal)
        VALUES (v_sale_id, v_item.product_id, v_item.unit_price, v_item.quantity, v_item.unit_price * v_item.quantity);

        -- Deduct inventory
        UPDATE inventory
        SET quantity = quantity - v_item.quantity,
            updated_at = now()
        WHERE store_id = p_store_id AND product_id = v_item.product_id;

        -- Record stock movement
        INSERT INTO stock_movements (product_id, store_id, type, quantity, reference_id, notes, user_id)
        VALUES (v_item.product_id, p_store_id, 'SALE', -v_item.quantity, v_sale_id, 'Penjualan Kasir POS (' || v_transaction_number || ')', p_cashier_id);
    END LOOP;

    -- 5. Create Payment Record
    INSERT INTO payments (sale_id, payment_method, amount_paid, amount_change, payment_status)
    VALUES (v_sale_id, p_payment_method, p_amount_paid, v_change, 'COMPLETED');

    -- 6. Audit Log
    INSERT INTO audit_logs (user_id, store_id, action, entity, entity_id, metadata)
    VALUES (p_cashier_id, p_store_id, 'CREATE_SALE', 'sales', v_sale_id, jsonb_build_object('transaction_number', v_transaction_number, 'total_amount', v_total_amount));

    -- Return JSON result
    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'transaction_number', v_transaction_number,
        'total_amount', v_total_amount,
        'amount_paid', p_amount_paid,
        'amount_change', v_change
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Manual Stock Adjustment
CREATE OR REPLACE FUNCTION adjust_store_stock(
    p_store_id UUID,
    p_product_id UUID,
    p_new_quantity INT,
    p_notes TEXT,
    p_user_id UUID
) RETURNS INT AS $$
DECLARE
    v_old_quantity INT := 0;
    v_diff INT;
BEGIN
    IF p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Jumlah stok tidak boleh negatif';
    END IF;

    -- Get current stock
    SELECT COALESCE(quantity, 0) INTO v_old_quantity
    FROM inventory
    WHERE store_id = p_store_id AND product_id = p_product_id;

    v_diff := p_new_quantity - v_old_quantity;

    -- Upsert inventory balance
    INSERT INTO inventory (store_id, product_id, quantity, updated_at)
    VALUES (p_store_id, p_product_id, p_new_quantity, now())
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now();

    -- Record movement if changed
    IF v_diff <> 0 THEN
        INSERT INTO stock_movements (product_id, store_id, type, quantity, notes, user_id)
        VALUES (p_product_id, p_store_id, 'ADJUSTMENT', v_diff, COALESCE(p_notes, 'Penyesuaian stok manual'), p_user_id);
    END IF;

    RETURN p_new_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Atomic Inter-Store Stock Transfer (Task 3.1 & 3.2)
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
    IF p_from_store_id = p_to_store_id THEN
        RAISE EXCEPTION 'Toko asal dan toko tujuan transfer tidak boleh sama.';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Jumlah stok yang ditransfer harus lebih dari 0.';
    END IF;

    v_user_id := COALESCE(p_user_id, auth.uid());

    SELECT name INTO v_from_store_name FROM public.stores WHERE id = p_from_store_id;
    IF v_from_store_name IS NULL THEN
        RAISE EXCEPTION 'Toko asal (from_store_id) tidak ditemukan.';
    END IF;

    SELECT name INTO v_to_store_name FROM public.stores WHERE id = p_to_store_id;
    IF v_to_store_name IS NULL THEN
        RAISE EXCEPTION 'Toko tujuan (to_store_id) tidak ditemukan.';
    END IF;

    SELECT name, purchase_price INTO v_product_name, v_default_price
    FROM public.products WHERE id = p_product_id;
    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'Produk tidak ditemukan.';
    END IF;

    IF p_transfer_price IS NULL OR p_transfer_price = 0 THEN
        p_transfer_price := COALESCE(v_default_price, 0);
    END IF;

    -- Row-locking on source store
    SELECT COALESCE(quantity, 0) INTO v_current_stock
    FROM public.inventory
    WHERE store_id = p_from_store_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stok tidak mencukupi di %. Stok saat ini: %, diminta: %.',
            v_from_store_name, COALESCE(v_current_stock, 0), p_quantity;
    END IF;

    v_transfer_number := 'TRF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 6));

    INSERT INTO public.stock_transfers (
        transfer_number, from_store_id, to_store_id, user_id, notes, created_at
    ) VALUES (
        v_transfer_number, p_from_store_id, p_to_store_id, v_user_id, p_notes, now()
    ) RETURNING id INTO v_transfer_id;

    INSERT INTO public.stock_transfer_items (
        transfer_id, product_id, quantity, transfer_price
    ) VALUES (
        v_transfer_id, p_product_id, p_quantity, p_transfer_price
    );

    -- Reduce stock at source store
    v_new_source_stock := v_current_stock - p_quantity;
    UPDATE public.inventory
    SET quantity = v_new_source_stock, updated_at = now()
    WHERE store_id = p_from_store_id AND product_id = p_product_id;

    -- Upsert stock at destination store
    INSERT INTO public.inventory (store_id, product_id, quantity, updated_at)
    VALUES (p_to_store_id, p_product_id, p_quantity, now())
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET quantity = public.inventory.quantity + EXCLUDED.quantity, updated_at = now()
    RETURNING quantity INTO v_new_dest_stock;

    -- Task 3.2: Record 2 movements
    INSERT INTO public.stock_movements (
        product_id, store_id, type, quantity, reference_id, notes, user_id, created_at
    ) VALUES (
        p_product_id, p_from_store_id, 'TRANSFER_OUT', -p_quantity, v_transfer_id,
        COALESCE(p_notes, 'Transfer ke ' || v_to_store_name || ' (' || v_transfer_number || ')'), v_user_id, now()
    );

    INSERT INTO public.stock_movements (
        product_id, store_id, type, quantity, reference_id, notes, user_id, created_at
    ) VALUES (
        p_product_id, p_to_store_id, 'TRANSFER_IN', p_quantity, v_transfer_id,
        COALESCE(p_notes, 'Transfer masuk dari ' || v_from_store_name || ' (' || v_transfer_number || ')'), v_user_id, now()
    );

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

-- Function for Low Stock Threshold Query (Task 3.3)
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
        (COALESCE(inv.quantity, 0) <= 0) DESC,
        inv.quantity ASC,
        p.name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- View for Cross-Store Low Stock Alerts
CREATE OR REPLACE VIEW public.view_low_stock_alerts
WITH (security_invoker = true)
AS
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

-- ==========================================
-- AUTH TRIGGERS & HOOKS (TASK 2.1)
-- ==========================================

-- Trigger to automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_default_role user_role := 'cashier';
BEGIN
    v_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        NULLIF(split_part(new.email, '@', 1), ''),
        'Kasir Baru'
    );

    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES (new.id, v_full_name, v_default_role, now())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES (TASK 2.2)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.auth_user_role() RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_stores WHERE user_id = auth.uid() AND store_id = p_store_id
    ) OR (public.auth_user_role() = 'owner');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Profiles: Users can read profiles; user can edit own name; owner has full control
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY profiles_all_owner ON public.profiles FOR ALL USING (public.auth_user_role() = 'owner');

-- User Stores: Users view their store assignments; owner can assign/manage
CREATE POLICY user_stores_select ON public.user_stores FOR SELECT
    USING (user_id = auth.uid() OR public.auth_user_role() = 'owner');
CREATE POLICY user_stores_all_owner ON public.user_stores FOR ALL
    USING (public.auth_user_role() = 'owner')
    WITH CHECK (public.auth_user_role() = 'owner');

-- Stores: Anyone with access can view; owner can manage
CREATE POLICY stores_select ON public.stores FOR SELECT USING (public.user_has_store_access(id));
CREATE POLICY stores_owner ON public.stores FOR ALL USING (public.auth_user_role() = 'owner');

-- Categories & Products: Authenticated users can view; owner/manager can edit
CREATE POLICY categories_select ON public.categories FOR SELECT USING (true);
CREATE POLICY categories_admin ON public.categories FOR ALL
    USING (public.auth_user_role() IN ('owner', 'manager'))
    WITH CHECK (public.auth_user_role() IN ('owner', 'manager'));

CREATE POLICY products_select ON public.products FOR SELECT USING (true);
CREATE POLICY products_admin ON public.products FOR ALL
    USING (public.auth_user_role() IN ('owner', 'manager'))
    WITH CHECK (public.auth_user_role() IN ('owner', 'manager'));

-- Inventory: Accessible per store access; modifications restricted to owner & manager
CREATE POLICY inventory_select ON public.inventory FOR SELECT USING (public.user_has_store_access(store_id));
CREATE POLICY inventory_admin ON public.inventory FOR ALL
    USING (public.user_has_store_access(store_id) AND public.auth_user_role() IN ('owner', 'manager'))
    WITH CHECK (public.user_has_store_access(store_id) AND public.auth_user_role() IN ('owner', 'manager'));

-- Stock Movements: Accessible per store access
CREATE POLICY movements_select ON public.stock_movements FOR SELECT USING (public.user_has_store_access(store_id));
CREATE POLICY movements_insert ON public.stock_movements FOR INSERT WITH CHECK (public.user_has_store_access(store_id));

-- Sales, Sale Items, Payments: Accessible per store access
CREATE POLICY sales_select ON public.sales FOR SELECT USING (public.user_has_store_access(store_id));
CREATE POLICY sales_insert ON public.sales FOR INSERT WITH CHECK (public.user_has_store_access(store_id));

CREATE POLICY sale_items_select ON public.sale_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.user_has_store_access(s.store_id))
);
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.user_has_store_access(s.store_id))
);

CREATE POLICY payments_select ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.user_has_store_access(s.store_id))
);
CREATE POLICY payments_insert ON public.payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND public.user_has_store_access(s.store_id))
);

-- Stock Transfers: Accessible if user has access to source or destination store
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_transfers_select ON public.stock_transfers FOR SELECT
    USING (
        public.user_has_store_access(from_store_id)
        OR public.user_has_store_access(to_store_id)
        OR public.auth_user_role() = 'owner'
    );

CREATE POLICY stock_transfers_insert ON public.stock_transfers FOR INSERT
    WITH CHECK (
        (public.user_has_store_access(from_store_id) AND public.auth_user_role() IN ('owner', 'manager'))
        OR public.auth_user_role() = 'owner'
    );

CREATE POLICY stock_transfer_items_select ON public.stock_transfer_items FOR SELECT
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

CREATE POLICY stock_transfer_items_insert ON public.stock_transfer_items FOR INSERT
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
