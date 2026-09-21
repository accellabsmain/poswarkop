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

-- Function for Atomic Sale Processing (Phase 4 Optimized)
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
    v_effective_amount_paid NUMERIC;
    v_item RECORD;
    v_curr_stock INT;
    v_product_name TEXT;
    v_change NUMERIC := 0;
    v_cashier_name TEXT;
BEGIN
    -- 1. Input Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Store ID tidak boleh kosong';
    END IF;

    IF p_cashier_id IS NULL THEN
        RAISE EXCEPTION 'Cashier ID tidak boleh kosong';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong';
    END IF;

    -- Validate Store Existence
    IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Toko tidak ditemukan';
    END IF;

    -- Fetch Cashier Name for audit & receipt fallback
    SELECT full_name INTO v_cashier_name
    FROM profiles
    WHERE id = p_cashier_id;

    -- 2. Validate Cart Items & Calculate Total Amount with Explicit Row Locking (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Jumlah kuantitas produk harus lebih dari 0';
        END IF;

        IF v_item.unit_price IS NULL OR v_item.unit_price < 0 THEN
            RAISE EXCEPTION 'Harga satuan produk tidak valid';
        END IF;

        -- Fetch Product Name
        SELECT p.name INTO v_product_name
        FROM products p
        WHERE p.id = v_item.product_id;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Produk tidak ditemukan dalam sistem';
        END IF;

        -- Explicit Row-Level Locking on Inventory to prevent race conditions / concurrent checkout
        -- Mengunci baris inventaris toko dan membaca nilai stok terkini setelah lock diperoleh
        v_curr_stock := 0;
        SELECT COALESCE(quantity, 0)
        INTO v_curr_stock
        FROM inventory 
        WHERE store_id = p_store_id AND product_id = v_item.product_id 
        FOR UPDATE;

        IF v_curr_stock IS NULL OR v_curr_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Stok untuk produk "%" tidak mencukupi (Tersedia: %, Diminta: %)', v_product_name, COALESCE(v_curr_stock, 0), v_item.quantity;
        END IF;

        v_total_amount := v_total_amount + (v_item.unit_price * v_item.quantity);
    END LOOP;

    -- 3. Task 4.3: Payment Validation & Change Logic
    IF p_payment_method = 'CASH' THEN
        IF p_amount_paid IS NULL OR p_amount_paid < v_total_amount THEN
            RAISE EXCEPTION 'Uang pembayaran (Rp %) kurang dari total transaksi (Rp %)', COALESCE(p_amount_paid, 0), v_total_amount;
        END IF;
        v_effective_amount_paid := p_amount_paid;
        v_change := p_amount_paid - v_total_amount;
    ELSE
        -- Non-Cash payments (QRIS, DEBIT, TRANSFER) expect exact amount
        v_effective_amount_paid := v_total_amount;
        v_change := 0;
    END IF;

    -- 4. Generate Unique Transaction Number TRX-YYYYMMDD-HHMMSS-RAND
    v_transaction_number := 'TRX-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || LPAD(FLOOR(random() * 1000)::text, 3, '0');

    -- 5. Create Sale Record
    INSERT INTO sales (transaction_number, store_id, cashier_id, total_amount, payment_method, status)
    VALUES (v_transaction_number, p_store_id, p_cashier_id, v_total_amount, p_payment_method, 'COMPLETED')
    RETURNING id INTO v_sale_id;

    -- 6. Create Sale Items, Deduct Inventory, Record Movements
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

    -- 7. Create Payment Record
    INSERT INTO payments (sale_id, payment_method, amount_paid, amount_change, payment_status)
    VALUES (v_sale_id, p_payment_method, v_effective_amount_paid, v_change, 'COMPLETED');

    -- 8. Audit Log
    INSERT INTO audit_logs (user_id, store_id, action, entity, entity_id, metadata)
    VALUES (
        p_cashier_id, 
        p_store_id, 
        'CREATE_SALE', 
        'sales', 
        v_sale_id, 
        jsonb_build_object(
            'transaction_number', v_transaction_number, 
            'total_amount', v_total_amount,
            'payment_method', p_payment_method,
            'amount_paid', v_effective_amount_paid,
            'amount_change', v_change
        )
    );

    -- 9. Return Detailed JSON Result
    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'transaction_number', v_transaction_number,
        'total_amount', v_total_amount,
        'amount_paid', v_effective_amount_paid,
        'amount_change', v_change,
        'payment_method', p_payment_method,
        'cashier_name', COALESCE(v_cashier_name, 'Kasir'),
        'created_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for Receipt Details Query (Phase 4 Task 4.2)
CREATE OR REPLACE FUNCTION get_receipt_details(p_sale_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_receipt JSONB;
BEGIN
    SELECT jsonb_build_object(
        'sale', jsonb_build_object(
            'id', s.id,
            'transaction_number', s.transaction_number,
            'store_id', s.store_id,
            'store_name', st.name,
            'cashier_id', s.cashier_id,
            'cashier_name', COALESCE(p.full_name, 'Kasir POS'),
            'total_amount', s.total_amount,
            'payment_method', COALESCE(pay.payment_method, s.payment_method),
            'status', s.status,
            'notes', s.notes,
            'created_at', s.created_at
        ),
        'store', jsonb_build_object(
            'id', st.id,
            'name', st.name,
            'address', st.address,
            'phone', st.phone,
            'code', st.code
        ),
        'cashier_name', COALESCE(p.full_name, 'Kasir POS'),
        'payment', jsonb_build_object(
            'id', COALESCE(pay.id, s.id),
            'sale_id', s.id,
            'payment_method', COALESCE(pay.payment_method, s.payment_method),
            'amount_paid', COALESCE(pay.amount_paid, s.total_amount),
            'amount_change', COALESCE(pay.amount_change, 0),
            'payment_status', COALESCE(pay.payment_status, 'COMPLETED'),
            'created_at', COALESCE(pay.created_at, s.created_at)
        ),
        'items', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', si.id,
                    'sale_id', si.sale_id,
                    'product_id', si.product_id,
                    'product_name', pr.name,
                    'unit_price', si.unit_price,
                    'quantity', si.quantity,
                    'subtotal', si.subtotal
                )
            )
            FROM sale_items si
            JOIN products pr ON pr.id = si.product_id
            WHERE si.sale_id = s.id
        ), '[]'::jsonb),
        -- Flat aliases for backward compatibility
        'sale_id', s.id,
        'transaction_number', s.transaction_number,
        'created_at', s.created_at,
        'status', s.status,
        'total_amount', s.total_amount,
        'cashier', jsonb_build_object(
            'id', s.cashier_id,
            'full_name', COALESCE(p.full_name, 'Kasir POS')
        )
    ) INTO v_receipt
    FROM sales s
    JOIN stores st ON st.id = s.store_id
    LEFT JOIN profiles p ON p.id = s.cashier_id
    LEFT JOIN payments pay ON pay.sale_id = s.id
    WHERE s.id = p_sale_id;

    IF v_receipt IS NULL THEN
        RAISE EXCEPTION 'Transaksi penjualan tidak ditemukan';
    END IF;

    RETURN v_receipt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- ============================================================================
-- PHASE 5: OWNER DASHBOARD & USER MANAGEMENT (TASKS 5.1 - 5.3)
-- ============================================================================

-- 1. View Ringkasan Omset & Transaksi per Toko (Task 5.2)
CREATE OR REPLACE VIEW public.view_store_revenue_summary
WITH (security_invoker = true)
AS
SELECT
    s.id AS store_id,
    s.name AS store_name,
    s.code AS store_code,
    COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED'), 0)::NUMERIC AS total_revenue,
    COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED'), 0)::BIGINT AS total_transactions,
    COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('day', now())), 0)::NUMERIC AS today_revenue,
    COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('day', now())), 0)::BIGINT AS today_transactions,
    COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('month', now())), 0)::NUMERIC AS this_month_revenue,
    COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('month', now())), 0)::BIGINT AS this_month_transactions
FROM public.stores s
LEFT JOIN public.sales sal ON sal.store_id = s.id
GROUP BY s.id, s.name, s.code;

-- 2. RPC Function: Ambil Ringkasan Omset Toko (Task 5.2)
CREATE OR REPLACE FUNCTION public.get_store_revenue_summary()
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    store_code TEXT,
    total_revenue NUMERIC,
    total_transactions BIGINT,
    today_revenue NUMERIC,
    today_transactions BIGINT,
    this_month_revenue NUMERIC,
    this_month_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS store_id,
        s.name AS store_name,
        s.code AS store_code,
        COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED'), 0)::NUMERIC AS total_revenue,
        COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED'), 0)::BIGINT AS total_transactions,
        COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('day', now())), 0)::NUMERIC AS today_revenue,
        COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('day', now())), 0)::BIGINT AS today_transactions,
        COALESCE(SUM(sal.total_amount) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('month', now())), 0)::NUMERIC AS this_month_revenue,
        COALESCE(COUNT(sal.id) FILTER (WHERE sal.status = 'COMPLETED' AND sal.created_at >= date_trunc('month', now())), 0)::BIGINT AS this_month_transactions
    FROM public.stores s
    LEFT JOIN public.sales sal ON sal.store_id = s.id
    GROUP BY s.id, s.name, s.code
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. RPC Function: Data Grafik Penjualan Harian & Bulanan (Task 5.2)
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_store_id UUID DEFAULT NULL,
    p_period TEXT DEFAULT 'daily',
    p_limit INT DEFAULT 30
)
RETURNS TABLE (
    period_date TEXT,
    revenue NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    IF p_period = 'monthly' THEN
        RETURN QUERY
        SELECT
            to_char(date_trunc('month', s.created_at), 'YYYY-MM') AS period_date,
            COALESCE(SUM(s.total_amount), 0)::NUMERIC AS revenue,
            COUNT(s.id)::BIGINT AS transaction_count
        FROM public.sales s
        WHERE s.status = 'COMPLETED'
          AND (p_store_id IS NULL OR s.store_id = p_store_id)
        GROUP BY date_trunc('month', s.created_at)
        ORDER BY date_trunc('month', s.created_at) ASC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            to_char(date_trunc('day', s.created_at), 'YYYY-MM-DD') AS period_date,
            COALESCE(SUM(s.total_amount), 0)::NUMERIC AS revenue,
            COUNT(s.id)::BIGINT AS transaction_count
        FROM public.sales s
        WHERE s.status = 'COMPLETED'
          AND (p_store_id IS NULL OR s.store_id = p_store_id)
          AND s.created_at >= (now() - (p_limit || ' days')::INTERVAL)
        GROUP BY date_trunc('day', s.created_at)
        ORDER BY date_trunc('day', s.created_at) ASC;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. RPC Function: Top-Selling Products (Task 5.2)
CREATE OR REPLACE FUNCTION public.get_top_selling_products(
    p_store_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    category_name TEXT,
    total_units_sold BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(SUM(si.quantity), 0)::BIGINT AS total_units_sold,
        COALESCE(SUM(si.subtotal), 0)::NUMERIC AS total_revenue
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    JOIN public.products p ON p.id = si.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE s.status = 'COMPLETED'
      AND (p_store_id IS NULL OR s.store_id = p_store_id)
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_units_sold DESC, total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. RLS Hardening pada Tabel audit_logs (Task 5.3)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view all audit logs" ON public.audit_logs;
CREATE POLICY "Owners can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
);

DROP POLICY IF EXISTS "Managers can view store audit logs" ON public.audit_logs;
CREATE POLICY "Managers can view store audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_stores us ON us.user_id = p.id
        WHERE p.id = auth.uid()
          AND p.role = 'manager'
          AND us.store_id = audit_logs.store_id
    )
);

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. RPC Function: Ambil Audit Logs Terstruktur (Task 5.3)
CREATE OR REPLACE FUNCTION public.get_audit_logs(
    p_store_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    store_id UUID,
    store_name TEXT,
    action TEXT,
    entity TEXT,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        COALESCE(p.full_name, 'Sistem') AS user_name,
        al.store_id,
        COALESCE(st.name, 'Global') AS store_name,
        al.action,
        al.entity,
        al.entity_id,
        al.metadata,
        al.created_at
    FROM public.audit_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    LEFT JOIN public.stores st ON st.id = al.store_id
    WHERE (p_store_id IS NULL OR al.store_id = p_store_id)
      AND (p_action IS NULL OR al.action = p_action)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

