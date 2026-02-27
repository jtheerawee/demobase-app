export const CONDITIONS = [
    { value: "nm", label: "Near Mint" },
    { value: "lp", label: "Lightly Played" },
    { value: "mp", label: "Moderately Played" },
    { value: "hp", label: "Heavily Played" },
    { value: "dmg", label: "Damaged" },
] as const;

export type ConditionValue = (typeof CONDITIONS)[number]["value"];

export const getConditionLabel = (
    conditionValue: string | null | undefined,
): string => {
    if (!conditionValue) return "Unknown";
    const found = CONDITIONS.find((c) => c.value === conditionValue);
    return found ? found.label : "Unknown";
};
