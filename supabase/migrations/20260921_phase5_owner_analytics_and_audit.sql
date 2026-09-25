-- Migration: Phase 5 — Owner Dashboard & User Management (Tasks 5.1, 5.2, 5.3)
-- Created: 2026-09-21
-- Author: Lintang (Backend & Database Engineer)

-- ============================================================================
-- 1. TASK 5.2: Aggregated Sales & Revenue Analytics Query Functions & Views
-- ============================================================================

-- 1.1 View Ringkasan Omset & Transaksi per Toko
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

-- 1.2 RPC Function: Ambil Ringkasan Omset Toko
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

-- 1.3 RPC Function: Data Grafik Penjualan Harian & Bulanan
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_store_id UUID DEFAULT NULL,
    p_period TEXT DEFAULT 'daily', -- 'daily' atau 'monthly'
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

-- 1.4 RPC Function: Top-Selling Products (Lintas Toko / Per Toko)
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
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE s.status = 'COMPLETED'
      AND (p_store_id IS NULL OR s.store_id = p_store_id)
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_units_sold DESC, total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. TASK 5.3: Audit Log Query Function & RLS Hardening
-- ============================================================================

-- Aktifkan RLS pada tabel audit_logs jika belum aktif
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Owner dapat melihat seluruh audit logs
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

-- Policy: Manager dapat melihat log toko yang ditugaskan
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

-- Policy: Semua user terautentikasi dapat membuat log aktivitas
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2.1 RPC Function: Ambil Audit Logs Terstruktur
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
