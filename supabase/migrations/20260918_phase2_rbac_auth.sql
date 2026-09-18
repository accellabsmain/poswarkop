-- ==============================================================================
-- Migration: Phase 2 — RBAC & Authentication (Tasks 2.1 & 2.2)
-- Author: Lintang (Backend & Database Engineer)
-- Description:
-- 1. Task 2.1: Supabase Auth Auto-Profile Trigger (handle_new_user)
-- 2. Task 2.2: Tightened Row Level Security (RLS) Policies
-- ==============================================================================

-- ==============================================================================
-- 1. TASK 2.1: SUPABASE AUTH AUTO-PROFILE TRIGGER
-- ==============================================================================

-- Create or replace trigger function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_default_role user_role := 'cashier';
BEGIN
    -- Extract full_name from raw_user_meta_data or fallback to email prefix or default
    v_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        NULLIF(split_part(new.email, '@', 1), ''),
        'Kasir Baru'
    );

    -- Insert into profiles with default 'cashier' role
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES (new.id, v_full_name, v_default_role, now())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. TASK 2.2: TIGHTEN ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper Functions (Security Check)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_has_store_access(p_store_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_stores
        WHERE user_id = auth.uid() AND store_id = p_store_id
    ) OR (public.auth_user_role() = 'owner');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- A. PROFILES Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_all_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

-- All authenticated users can view profiles (to display cashier names, staff lists)
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- User can update their own full_name, but CANNOT escalate their own role
CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Owner has full control over all profiles (can change roles, manage accounts)
CREATE POLICY profiles_all_owner ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.auth_user_role() = 'owner')
    WITH CHECK (public.auth_user_role() = 'owner');

-- ------------------------------------------------------------------------------
-- B. USER_STORES Table RLS (Store Access Assignment)
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_stores_select ON public.user_stores;
DROP POLICY IF EXISTS user_stores_all_owner ON public.user_stores;

-- Users can view their own store assignments; Owner can view all assignments
CREATE POLICY user_stores_select ON public.user_stores
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.auth_user_role() = 'owner'
    );

-- Only Owner can assign or remove store access for users
CREATE POLICY user_stores_all_owner ON public.user_stores
    FOR ALL
    TO authenticated
    USING (public.auth_user_role() = 'owner')
    WITH CHECK (public.auth_user_role() = 'owner');

-- ------------------------------------------------------------------------------
-- C. STORES Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stores_select ON public.stores;
DROP POLICY IF EXISTS stores_owner ON public.stores;

-- Users can view stores they have access to; Owner can view all stores
CREATE POLICY stores_select ON public.stores
    FOR SELECT
    TO authenticated
    USING (public.user_has_store_access(id));

-- Only Owner can create, edit, or delete store configurations
CREATE POLICY stores_owner ON public.stores
    FOR ALL
    TO authenticated
    USING (public.auth_user_role() = 'owner')
    WITH CHECK (public.auth_user_role() = 'owner');

-- ------------------------------------------------------------------------------
-- D. CATEGORIES Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select ON public.categories;
DROP POLICY IF EXISTS categories_admin ON public.categories;

-- Authenticated users (Cashier, Manager, Owner) can view categories
CREATE POLICY categories_select ON public.categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Only Owner & Manager can insert, update, or delete categories
CREATE POLICY categories_admin ON public.categories
    FOR ALL
    TO authenticated
    USING (public.auth_user_role() IN ('owner', 'manager'))
    WITH CHECK (public.auth_user_role() IN ('owner', 'manager'));

-- ------------------------------------------------------------------------------
-- E. PRODUCTS Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_admin ON public.products;

-- Authenticated users can view active catalog products
CREATE POLICY products_select ON public.products
    FOR SELECT
    TO authenticated
    USING (true);

-- Only Owner & Manager can create, update, or delete products (Cashier CANNOT modify)
CREATE POLICY products_admin ON public.products
    FOR ALL
    TO authenticated
    USING (public.auth_user_role() IN ('owner', 'manager'))
    WITH CHECK (public.auth_user_role() IN ('owner', 'manager'));

-- ------------------------------------------------------------------------------
-- F. INVENTORY Table RLS (Per-Store Stock Isolation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_select ON public.inventory;
DROP POLICY IF EXISTS inventory_admin ON public.inventory;

-- Users can view inventory for stores they have access to
CREATE POLICY inventory_select ON public.inventory
    FOR SELECT
    TO authenticated
    USING (public.user_has_store_access(store_id));

-- Direct modifications restricted to Owner & Manager with store access
-- (Cashier updates stock securely via atomic RPC process_sale_transaction or adjust_store_stock)
CREATE POLICY inventory_admin ON public.inventory
    FOR ALL
    TO authenticated
    USING (
        public.user_has_store_access(store_id)
        AND public.auth_user_role() IN ('owner', 'manager')
    )
    WITH CHECK (
        public.user_has_store_access(store_id)
        AND public.auth_user_role() IN ('owner', 'manager')
    );

-- ------------------------------------------------------------------------------
-- G. STOCK MOVEMENTS Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movements_select ON public.stock_movements;
DROP POLICY IF EXISTS movements_insert ON public.stock_movements;

CREATE POLICY movements_select ON public.stock_movements
    FOR SELECT
    TO authenticated
    USING (public.user_has_store_access(store_id));

CREATE POLICY movements_insert ON public.stock_movements
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_has_store_access(store_id));

-- ------------------------------------------------------------------------------
-- H. SALES & CHECKOUT Tables RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_select ON public.sales;
DROP POLICY IF EXISTS sales_insert ON public.sales;
DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_insert ON public.payments;

CREATE POLICY sales_select ON public.sales
    FOR SELECT
    TO authenticated
    USING (public.user_has_store_access(store_id));

CREATE POLICY sales_insert ON public.sales
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_has_store_access(store_id));

CREATE POLICY sale_items_select ON public.sale_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id AND public.user_has_store_access(s.store_id)
        )
    );

CREATE POLICY sale_items_insert ON public.sale_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id AND public.user_has_store_access(s.store_id)
        )
    );

CREATE POLICY payments_select ON public.payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id AND public.user_has_store_access(s.store_id)
        )
    );

CREATE POLICY payments_insert ON public.payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id AND public.user_has_store_access(s.store_id)
        )
    );
