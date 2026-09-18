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

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION auth_user_role() RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION user_has_store_access(p_store_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_stores WHERE user_id = auth.uid() AND store_id = p_store_id
    ) OR (auth_user_role() = 'owner');
$$ LANGUAGE sql STABLE;

-- Profiles: Users can read profiles, owner can manage
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_all_owner ON profiles FOR ALL USING (auth_user_role() = 'owner');

-- Stores: Anyone authenticated can view allowed stores
CREATE POLICY stores_select ON stores FOR SELECT USING (user_has_store_access(id));
CREATE POLICY stores_owner ON stores FOR ALL USING (auth_user_role() = 'owner');

-- Categories & Products: Authenticated users can view; owner/manager can edit
CREATE POLICY categories_select ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin ON categories FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

CREATE POLICY products_select ON products FOR SELECT USING (true);
CREATE POLICY products_admin ON products FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

-- Inventory: Accessible per store access
CREATE POLICY inventory_select ON inventory FOR SELECT USING (user_has_store_access(store_id));
CREATE POLICY inventory_admin ON inventory FOR ALL USING (user_has_store_access(store_id));

-- Stock Movements: Accessible per store access
CREATE POLICY movements_select ON stock_movements FOR SELECT USING (user_has_store_access(store_id));
CREATE POLICY movements_insert ON stock_movements FOR INSERT WITH CHECK (user_has_store_access(store_id));

-- Sales, Sale Items, Payments: Accessible per store access
CREATE POLICY sales_select ON sales FOR SELECT USING (user_has_store_access(store_id));
CREATE POLICY sales_insert ON sales FOR INSERT WITH CHECK (user_has_store_access(store_id));

CREATE POLICY sale_items_select ON sale_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND user_has_store_access(s.store_id))
);

CREATE POLICY payments_select ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND user_has_store_access(s.store_id))
);
