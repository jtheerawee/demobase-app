import { LORCANA_CONFIG } from "./franchises/lorcana";
import { MTG_CONFIG } from "./franchises/mtg";
import { ONEPIECE_CONFIG } from "./franchises/onepiece";
import { POKEMON_CONFIG } from "./franchises/pokemon";

export const APP_CONFIG = {
    // App
    APP_NAME: "DemoBase.app",
    APP_VERSION: "0.0.1",
    FONT_FAMILY: "Kanit",
    SHOW_TOOLTIP: false,

    // Common
    NOTIFICATION_AUTO_CLOSE: 5000,

    // MTG
    MTG_URL_EN: MTG_CONFIG.URL_EN,
    MTG_RARITY_MAP: MTG_CONFIG.RARITY_MAP,

    // Pokemon
    POKEMON_URL_EN: POKEMON_CONFIG.URL_EN,
    POKEMON_URL_JP: POKEMON_CONFIG.URL_JP,
    POKEMON_URL_TH: POKEMON_CONFIG.URL_TH,
    POKEMON_RARITY_MAP: POKEMON_CONFIG.RARITY_MAP,
    POKEMON_SET_MAP: POKEMON_CONFIG.SET_MAP,

    // One piece
    ONEPIECE_URL_EN: ONEPIECE_CONFIG.URL_EN,
    ONEPIECE_URL_JP: ONEPIECE_CONFIG.URL_JP,

    // Lorcana
    LORCANA_URL_EN: LORCANA_CONFIG.URL_EN,
    LORCANA_RARITY_MAP: LORCANA_CONFIG.RARITY_MAP,
    LORCANA_SET_MAP: LORCANA_CONFIG.SET_MAP,

    // Card Kingdom
    // CKD_URL: "https://www.cardkingdom.com/mtg/lorwyn-eclipsed/formidable-speaker",
    // TCGPlayer
    // TCG_URL: "https://www.tcgplayer.com/product/619740/lorcana-tcg-archazias-island-tramp-enterprising-dog-enchanted?page=1&Language=all",
} as const;
