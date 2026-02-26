export const LANGUAGE_OPTIONS: Record<
    string,
    { value: string; label: string }[]
> = {
    mtg: [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
    ],
    pokemon: [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
        { value: "th", label: "Thai" },
    ],
    "one-piece": [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
    ],
    lorcana: [{ value: "en", label: "English" }],
};

export const FRANCHISE_OPTIONS = [
    { value: "mtg", label: "MTG" },
    { value: "pokemon", label: "Pokémon" },
    { value: "one-piece", label: "One Piece" },
    { value: "lorcana", label: "Lorcana" },
];
