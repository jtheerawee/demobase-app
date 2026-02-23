-- ==========================================
-- 07. EBAY SEARCHES TABLE
-- ==========================================

CREATE TABLE public.ebay_searches (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    keyword         TEXT NOT NULL,
    service         TEXT NOT NULL, -- psa, bgs, cgc, etc.
    grade           SMALLINT,
    min_price       NUMERIC,
    max_price       NUMERIC,
    listing_type    TEXT, -- 'auction' or 'fixed_price'
    exclude_jp      boolean not null default false,
    only_us         boolean not null default false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
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
