-- ==========================================
-- DROP EXISTING TABLES (CAUTION: Deletes all scraped data)
-- ==========================================
DROP TABLE IF EXISTS public.scraped_cards;
DROP TABLE IF EXISTS public.scraped_collections;

-- ==========================================
-- SCRAPED COLLECTIONS TABLE
-- ==========================================

CREATE TABLE public.scraped_collections (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,
    collection_code TEXT,
    image_url       TEXT,
    collection_url  TEXT NOT NULL UNIQUE,
    franchise       TEXT NOT NULL, -- 'mtg', 'pokemon', etc.
    language        TEXT NOT NULL, -- 'en', 'jp', 'th', etc.
    release_year    INTEGER,       -- Scraped year
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.scraped_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scraped collections" ON public.scraped_collections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage scraped collections" ON public.scraped_collections
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- INDEXES
CREATE INDEX idx_scraped_collections_franchise ON public.scraped_collections(franchise);
CREATE INDEX idx_scraped_collections_url ON public.scraped_collections(collection_url);
CREATE INDEX idx_scraped_collections_language ON public.scraped_collections(language);

-- ==========================================
-- SCRAPED CARDS TABLE
-- ==========================================

CREATE TABLE public.scraped_cards (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    collection_id     BIGINT REFERENCES public.scraped_collections(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    image_url         TEXT NOT NULL,
    card_url          TEXT NOT NULL UNIQUE,
    tcg_url           TEXT UNIQUE,
    card_no           TEXT NOT NULL,
    rarity            TEXT NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ENABLE RLS
ALTER TABLE public.scraped_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scraped cards" ON public.scraped_cards
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage scraped cards" ON public.scraped_cards
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- INDEXES
CREATE INDEX idx_scraped_cards_collection_id ON public.scraped_cards(collection_id);
CREATE INDEX idx_scraped_cards_card_url ON public.scraped_cards(card_url);
