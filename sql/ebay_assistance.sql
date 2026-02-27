-- ==========================================
-- 00. CLEANUP (DROP EXISTING)
-- ==========================================

DROP TABLE IF EXISTS public.ebay_searches CASCADE;
DROP TABLE IF EXISTS public.ebay_price_history CASCADE;
-- ==========================================
-- 01. EBAY SEARCHES TABLE
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

-- ==========================================
-- 04. EBAY PRICE HISTORY TABLE
-- ==========================================

CREATE TABLE public.ebay_price_history (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id         TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    price           NUMERIC NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    sold_date       TIMESTAMPTZ NOT NULL,
    listing_type    TEXT, -- 'auction', 'fixed_price'
    bids            INTEGER,
    image_url       TEXT,
    item_url        TEXT,
    item_location   TEXT,
    service         TEXT, -- psa, bgs, cgc, sgc, etc.
    grade           TEXT, -- "10", "9", etc.
    cert_number     TEXT,
    seller_username TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.ebay_price_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read (or authenticated) depends on usage. 
-- For now, let's allow authenticated users to read.
CREATE POLICY "Allow authenticated read price history" ON public.ebay_price_history
    FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users can insert
CREATE POLICY "Allow authenticated insert price history" ON public.ebay_price_history
    FOR INSERT TO authenticated WITH CHECK (true);

-- INDEXES
CREATE INDEX idx_ebay_price_history_item_id ON public.ebay_price_history(item_id);
CREATE INDEX idx_ebay_price_history_sold_date ON public.ebay_price_history(sold_date);
CREATE INDEX idx_ebay_price_history_service_grade ON public.ebay_price_history(service, grade);
