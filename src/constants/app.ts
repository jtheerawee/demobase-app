import { FRANCHISES } from "./franchises";
const getFranchise = (franchise: string) => FRANCHISES.find((f) => f.value === franchise);
const mtgConfigItem = getFranchise("mtg");
const pokemonConfigItem = getFranchise("pokemon");
const onePieceConfigItem = getFranchise("one-piece");
const lorcanaConfigItem = getFranchise("lorcana");

const mtgConfig = mtgConfigItem?.config || {};
const pokemonConfig = pokemonConfigItem?.config || {};
const onePieceConfig = onePieceConfigItem?.config || {};
const lorcanaConfig = lorcanaConfigItem?.config || {};

export const APP_CONFIG = {
    // App
    APP_NAME: "DemoBase.app",
    APP_VERSION: "0.0.1",
    FONT_FAMILY: "Kanit",
    SHOW_TOOLTIP: false,

    // Common
    NOTIFICATION_AUTO_CLOSE: 5000,

    // MTG
    MTG_URL_EN: mtgConfigItem?.languages.find((l) => l.value === "en")?.url as string,
    MTG_RARITY_MAP: (mtgConfig?.RARITY_MAP || {}) as Record<string, string>,

    // Pokemon
    POKEMON_URL_EN: pokemonConfigItem?.languages.find((l) => l.value === "en")?.url as string,
    POKEMON_URL_JP: pokemonConfigItem?.languages.find((l) => l.value === "jp")?.url as string,
    POKEMON_URL_TH: pokemonConfigItem?.languages.find((l) => l.value === "th")?.url as string,
    POKEMON_RARITY_MAP: (pokemonConfig?.RARITY_MAP || {}) as Record<string, string>,
    POKEMON_SET_MAP: (pokemonConfig?.SET_MAP || {}) as Record<string, string>,

    // One piece
    ONEPIECE_URL_EN: onePieceConfigItem?.languages.find((l) => l.value === "en")?.url as string,
    ONEPIECE_URL_JP: onePieceConfigItem?.languages.find((l) => l.value === "jp")?.url as string,

    // Lorcana
    LORCANA_URL_EN: lorcanaConfigItem?.languages.find((l) => l.value === "en")?.url as string,
    LORCANA_RARITY_MAP: (lorcanaConfig?.RARITY_MAP || {}) as Record<string, string>,
    LORCANA_SET_MAP: (lorcanaConfig?.SET_MAP || {}) as Record<string, string>,

    // Card Kingdom
    // CKD_URL: "https://www.cardkingdom.com/mtg/lorwyn-eclipsed/formidable-speaker",
    // TCGPlayer
    // TCG_URL: "https://www.tcgplayer.com/product/619740/lorcana-tcg-archazias-island-tramp-enterprising-dog-enchanted?page=1&Language=all",
} as const;
