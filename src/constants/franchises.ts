export type FranchiseLanguage = {
    value: string;
    label: string;
    url?: string;
    tcgUrl?: string;
};

export type FranchiseConfig = {
    RARITY_MAP?: Record<string, string>;
    SET_MAP?: Record<string, string>;
    SET_MAP_TCG_PLAYER?: Record<string, string>;
};

export type FranchiseOption = {
    value: string;
    label: string;
    languages: FranchiseLanguage[];
    config?: FranchiseConfig;
};

export const FRANCHISES: FranchiseOption[] = [
    {
        value: "mtg",
        label: "MTG",
        languages: [
            {
                value: "en",
                label: "English",
                url: "https://gatherer.wizards.com/sets",
            },
            {
                value: "jp",
                label: "Japanese",
                url: "https://gatherer.wizards.com/sets",
            },
        ],
        config: {
            RARITY_MAP: {
                Common: "C",
                Uncommon: "U",
                Rare: "R",
                "Mythic Rare": "M",
                Special: "S",
                "Basic Land": "L",
                Land: "L",
            },
        },
    },
    {
        value: "pokemon",
        label: "Pokémon",
        languages: [
            {
                value: "en",
                label: "English",
                url: "https://www.pokemon.com/us/pokemon-tcg/pokemon-cards",
                tcgUrl: "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid",
            },
            {
                value: "jp",
                label: "Japanese",
                url: "https://www.tcgplayer.com/search/pokemon-japan/product?productLineName=pokemon-japan&view=grid&ProductTypeName=Cards",
            },
            {
                value: "th",
                label: "Thai",
                url: "https://asia.pokemon-card.com/th/card-search/",
            },
        ],
        config: {
            RARITY_MAP: {
                Common: "C",
                "Common Holo": "CH",
                Uncommon: "U",
                "Uncommon Holo": "UH",
                Rare: "R",
                "Rare Holo": "RH",
                "Holo Rare": "RH", // reverse for Rare Holo
                "Holo Rare V": "RH",
                "Holo Rare VMAX": "RH",
                "Holo Rare VSTAR": "RH",
                "PIKA Rare Holo": "RH", // fix black and white
                "Illustration Rare": "IR",
                "Special Illustration Rare": "SIR",
                "Super Rare": "SR",
                "Super Rare Holo": "SRH",
                "Double Rare": "DR",
                "Ultra Rare": "UR",
                "Hyper Rare": "HR",
                "Radiant Rare": "Radiant Rare",
                "Rainbow Rare": "Rainbow Rare",
                "Black White Rare": "BWR",
                Promo: "P",
            },
            SET_MAP: {
                MEW: "sv3pt5",
                ASC: "me2pt5",
            },
            SET_MAP_TCG_PLAYER: {
                "sv-scarlet-and-violet-151": "sv3pt5",
                "me-ascended-heroes": "me2pt5",
            },
        },
    },
    {
        value: "one-piece",
        label: "One Piece",
        languages: [
            {
                value: "en",
                label: "English",
                url: "https://en.onepiece-cardgame.com/cardlist",
            },
            {
                value: "jp",
                label: "Japanese",
                url: "https://asia-th.onepiece-cardgame.com/cardlist",
            },
        ],
        config: {},
    },
    {
        value: "lorcana",
        label: "Lorcana",
        languages: [
            {
                value: "en",
                label: "English",
                url: "https://www.tcgplayer.com/search/lorcana-tcg/product?productLineName=lorcana-tcg&page=1&view=grid&ProductTypeName=Cards",
            },
        ],
        config: {
            RARITY_MAP: {
                Common: "C",
                Uncommon: "U",
                Rare: "R",
                "Super Rare": "SR",
                Legendary: "L",
                Enchanted: "E",
                Promo: "P",
            },
            SET_MAP: {
                "the-first-chapter": "1",
                "rise-of-the-floodborn": "2",
                "into-the-inklands": "3",
                "ursulas-return": "4",
                "shimmering-skies": "5",
                "azurite-sea": "6",
                "archazias-island": "7",
                "reign-of-jafar": "8",
                fabled: "9",
                "whispers-in-the-well": "10",
                winterspell: "11",
            },
        },
    },
];

export const FRANCHISE_INDEX = {
    MTG: 0,
    POKEMON: 1,
    ONEPIECE: 2,
    LORCANA: 3,
} as const;

// Helper to get just the options for dropdowns
export const FRANCHISE_OPTIONS = FRANCHISES.map((f) => ({
    value: f.value,
    label: f.label,
}));

// Helper to get languages for a specific franchise
export const getLanguagesForFranchise = (franchiseValue: string | null | undefined): FranchiseLanguage[] => {
    if (!franchiseValue || franchiseValue === "all") return [];
    return FRANCHISES.find((f) => f.value === franchiseValue)?.languages || [];
};
