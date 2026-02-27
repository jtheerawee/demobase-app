-- ==========================================
-- DROP EXISTING TABLES (CAUTION: Deletes User Inventory)
-- ==========================================
DROP TABLE IF EXISTS public.collected_cards CASCADE;

-- ==========================================
-- COLLECTED CARDS TABLE (User Inventory)
-- ==========================================

CREATE TABLE public.collected_cards (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    card_id           BIGINT REFERENCES public.scraped_cards(id) ON DELETE CASCADE,
    quantity          INTEGER DEFAULT 1 CHECK (quantity > 0),
    condition         TEXT, -- e.g., 'NM', 'LP', 'MP'
    variant           TEXT, -- e.g., 'F', 'NF', 'Holo'
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, card_id, variant, condition) -- Prevent duplicate entries for the same user/card version
);

-- ENABLE RLS
ALTER TABLE public.collected_cards ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
-- We link directly to user_id for security

CREATE POLICY "Users can view their own collected cards" ON public.collected_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own collected cards" ON public.collected_cards
    FOR ALL USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX idx_collected_cards_user_id ON public.collected_cards(user_id);
CREATE INDEX idx_collected_cards_card_id ON public.collected_cards(card_id);
