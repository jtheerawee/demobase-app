-- ==========================================
-- 00. CLEANUP (DROP EXISTING)
-- ==========================================
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
    role        SMALLINT DEFAULT 0, -- 0: user, 1: moderator, 2: admin
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
