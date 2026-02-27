export const VARIANTS = [
    { value: "nf", label: "Non-Foil", abbr: "NF" },
    { value: "f", label: "Foil", abbr: "F" },
] as const;

export type VariantValue = (typeof VARIANTS)[number]["value"];
export const DEFAULT_VARIANT = VARIANTS[0].value;

export const getVariantLabel = (value: string | null | undefined): string => {
    if (!value) return "Unknown";
    const found = VARIANTS.find((v) => v.value === value);
    return found ? found.label : "Unknown";
};

export const getVariantAbbr = (value: string | null | undefined): string => {
    if (!value) return VARIANTS[0].abbr;
    const found = VARIANTS.find((v) => v.value === value);
    return found ? found.abbr : VARIANTS[0].abbr;
};
