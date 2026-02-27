export const CONDITIONS = [
    { value: "nm", label: "Near Mint", abbr: "NM" },
    { value: "lp", label: "Lightly Played", abbr: "LP" },
    { value: "mp", label: "Moderately Played", abbr: "MP" },
    { value: "hp", label: "Heavily Played", abbr: "HP" },
    { value: "dmg", label: "Damaged", abbr: "DMG" },
] as const;

export type ConditionValue = (typeof CONDITIONS)[number]["value"];
export const DEFAULT_CONDITION = CONDITIONS[0].value;

export const getConditionLabel = (
    conditionValue: string | null | undefined,
): string => {
    if (!conditionValue) return "Unknown";
    const found = CONDITIONS.find((c) => c.value === conditionValue);
    return found ? found.label : "Unknown";
};

export const getConditionAbbr = (
    conditionValue: string | null | undefined,
): string => {
    if (!conditionValue) return CONDITIONS[0].abbr;
    const found = CONDITIONS.find((c) => c.value === conditionValue);
    return found ? found.abbr : CONDITIONS[0].abbr;
};
