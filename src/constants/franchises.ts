export type FranchiseLanguage = {
    value: string;
    label: string;
};

export type FranchiseOption = {
    value: string;
    label: string;
    languages: FranchiseLanguage[];
};

export const FRANCHISES: FranchiseOption[] = [
    {
        value: "mtg",
        label: "MTG",
        languages: [
            { value: "en", label: "English" },
            { value: "jp", label: "Japanese" },
        ],
    },
    {
        value: "pokemon",
        label: "Pokémon",
        languages: [
            { value: "en", label: "English" },
            { value: "jp", label: "Japanese" },
            { value: "th", label: "Thai" },
        ],
    },
    {
        value: "one-piece",
        label: "One Piece",
        languages: [
            { value: "en", label: "English" },
            { value: "jp", label: "Japanese" },
        ],
    },
    {
        value: "lorcana",
        label: "Lorcana",
        languages: [{ value: "en", label: "English" }],
    },
];

// Helper to get just the options for dropdowns
export const FRANCHISE_OPTIONS = FRANCHISES.map((f) => ({
    value: f.value,
    label: f.label,
}));

// Helper to get languages for a specific franchise
export const getLanguagesForFranchise = (
    franchiseValue: string | null | undefined,
): FranchiseLanguage[] => {
    if (!franchiseValue || franchiseValue === "all") return [];
    return FRANCHISES.find((f) => f.value === franchiseValue)?.languages || [];
};
