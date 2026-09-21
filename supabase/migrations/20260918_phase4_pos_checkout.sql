-- Migration: Phase 4 — Advanced POS Checkout & Payment Engine (Tasks 4.1, 4.2, 4.3)
-- Created: 2026-09-21
-- Author: Lintang (Backend & Database Engineer)

-- ============================================================================
-- 1. TASK 4.1 & 4.3: Optimized Atomic POS Checkout RPC Function
-- ============================================================================

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

        -- Fetch Product Name & Current Inventory
        SELECT p.name, COALESCE(i.quantity, 0)
        INTO v_product_name, v_curr_stock
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id AND i.store_id = p_store_id
        WHERE p.id = v_item.product_id;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Produk tidak ditemukan dalam sistem';
        END IF;

        -- Explicit Row-Level Locking on Inventory to prevent race conditions / concurrent checkout
        PERFORM 1 
        FROM inventory 
        WHERE store_id = p_store_id AND product_id = v_item.product_id 
        FOR UPDATE;

        IF v_curr_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Stok untuk produk "%" tidak mencukupi (Tersedia: %, Diminta: %)', v_product_name, v_curr_stock, v_item.quantity;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. TASK 4.2: High-Performance Receipt Data Query Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_receipt_details(p_sale_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_receipt JSONB;
BEGIN
    SELECT jsonb_build_object(
        'sale_id', s.id,
        'transaction_number', s.transaction_number,
        'created_at', s.created_at,
        'status', s.status,
        'total_amount', s.total_amount,
        'store', jsonb_build_object(
            'id', st.id,
            'name', st.name,
            'address', st.address,
            'phone', st.phone
        ),
        'cashier', jsonb_build_object(
            'id', s.cashier_id,
            'full_name', COALESCE(p.full_name, 'Kasir POS')
        ),
        'payment', jsonb_build_object(
            'method', pay.payment_method,
            'amount_paid', pay.amount_paid,
            'amount_change', pay.amount_change,
            'status', pay.payment_status,
            'created_at', pay.created_at
        ),
        'items', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', si.id,
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
        ), '[]'::jsonb)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
