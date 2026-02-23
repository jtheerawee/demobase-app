-- ==========================================
-- 00. CLEANUP (DROP EXISTING)
-- ==========================================

DROP TABLE IF EXISTS public.ebay_searches CASCADE;
DROP TABLE IF EXISTS public.user_statuses CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_sync CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==========================================
-- 01. USERS TABLE
-- ==========================================

-- Mirrors auth.users — one row per authenticated user.
-- Populated automatically via trigger on signup.
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_login  TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own row
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- UPDATE: users can update their own row
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==========================================
-- 02. USER STATUSES TABLE
-- ==========================================

CREATE TABLE public.user_statuses (
    user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    blocked     BOOLEAN NOT NULL DEFAULT false,
    premium     BOOLEAN NOT NULL DEFAULT false,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.user_statuses ENABLE ROW LEVEL SECURITY;

-- SELECT: users can view their own status
CREATE POLICY "Users can view own status" ON public.user_statuses
    FOR SELECT USING (auth.uid() = user_id);

-- Trigger: sync public.users when auth.users is created or updated (for last_login)
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Sync users table
    INSERT INTO public.users (id, email, avatar_url, last_login)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.last_sign_in_at
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login = EXCLUDED.last_login;

    -- Initialize status row if not exists
    INSERT INTO public.user_statuses (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_sync
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- ==========================================
-- 03. EBAY SEARCHES TABLE
-- ==========================================

CREATE TABLE public.ebay_searches (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    keyword         TEXT NOT NULL,
    service         TEXT NOT NULL, -- psa, bgs, cgc, etc.
    grade           SMALLINT, -- 10-1
    min_price       NUMERIC,
    max_price       NUMERIC,
    listing_type    TEXT, -- 'auction' or 'fixed_price'
    exclude_jp      boolean not null default false,
    only_us         boolean not null default false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, keyword, service, grade)
);

-- ENABLE RLS
ALTER TABLE public.ebay_searches ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner only
CREATE POLICY "Users can view their own saved searches" ON public.ebay_searches
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Owner only
CREATE POLICY "Users can create their own saved searches" ON public.ebay_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DELETE: Owner only
CREATE POLICY "Users can delete their own saved searches" ON public.ebay_searches
    FOR DELETE USING (auth.uid() = user_id);

-- UPDATE: Owner only
CREATE POLICY "Users can update their own saved searches" ON public.ebay_searches
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX idx_ebay_searches_user_id ON public.ebay_searches(user_id);
