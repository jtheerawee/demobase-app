export const APP_CONFIG = {
  // App
  APP_NAME: "DemoBase.app",

  // Scaper
  COLLECTION_CONCURRENCY_LIMIT: 4,
  CARD_CONCURRENCY_LIMIT: 10,
  NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT: 5,
  SCRAPER_GRID_COLS: 10,
  SCRAPER_PAGE_LOAD_DELAY_MS: 500,

  // MTG
  MTG_COLLECTION_URL: "https://gatherer.wizards.com/sets",

  // Pokemon
  POKEMON_URL_EN:
    "https://www.pokemon.com/us/pokemon-tcg/pokemon-cards?cardName=&cardText=&evolvesFrom=&me2pt5=on&me02=on&me01=on&mep=on&rsv10pt5=on&zsv10pt5=on&sv10=on&sv09=on&sv8pt5=on&sv08=on&sv07=on&sv6pt5=on&sv06=on&sv05=on&sv4pt5=on&sv04=on&sv3pt5=on&sv03=on&sv02=on&sv01=on&svp=on&swsh12pt5gg=on&swsh12pt5=on&swsh12tg=on&swsh12=on&swsh11tg=on&swsh11=on&pgo=on&swsh10tg=on&swsh10=on&swsh9tg=on&swsh9=on&swsh8=on&cel25c=on&cel25=on&swsh7=on&swsh6=on&swsh5=on&swsh45sv=on&swsh45=on&swsh4=on&swsh35=on&swsh3=on&swsh2=on&swsh1=on&swshp=on&sm12=on&sm115=on&sm11=on&sm10=on&det=on&sm9=on&sm8=on&sm75=on&sm7=on&sm6=on&sm5=on&sm4=on&sm35=on&sm3=on&sm2=on&sm1=on&sma=on&smp=on&xy12=on&xy11=on&xy10=on&g1=on&xy9=on&xy8=on&xy7=on&xy6=on&dc1=on&xy5=on&xy4=on&xy3=on&xy2=on&xy1=on&xy0=on&xya=on&xyp=on&bw11=on&bw10=on&bw9=on&bw8=on&bw7=on&dv1=on&bw6=on&bw5=on&bw4=on&bw3=on&bw2=on&bw1=on&bwp=on&col1=on&hgss4=on&hgss3=on&hgss2=on&hgss1=on&hsp=on&pl4=on&pl3=on&pl2=on&pl1=on&dp7=on&dp6=on&dp5=on&dp4=on&dp3=on&dp2=on&dp1=on&ex16=on&ex15=on&ex14=on&ex13=on&ex12=on&ex11=on&ex10=on&ex9=on&ex8=on&ex7=on&ex6=on&ex5=on&ex4=on&ex2=on&ex3=on&ex1=on&hitPointsMin=0&hitPointsMax=340&retreatCostMin=0&retreatCostMax=5&totalAttackCostMin=0&totalAttackCostMax=5&particularArtist=&advancedSubmit=",
  POKEMON_URL_JP:
    "https://www.tcgplayer.com/search/pokemon-japan/product?productLineName=pokemon-japan&view=grid&ProductTypeName=Cards&page=1",
  POKEMON_URL_TH: "https://asia.pokemon-card.com/th/card-search/",

  // One piece
  ONEPIECE_URL_EN: "https://en.onepiece-cardgame.com/cardlist",
  ONEPIECE_URL_JP: "https://asia-th.onepiece-cardgame.com/cardlist",

  // Search
  SEARCH_MIN_CHARS: 3,
  SEARCH_RESULTS_PER_ROW: 3,
  PREVIEW_IMAGE_WIDTH: 400,

  // Feature Toggles (Widgets)
  ENABLED_WIDGETS: {
    EBAY_ASSISTANCE: true,
    CARD_SCRAPER: true,
    CARD_MANAGER: true,

    // Card Scraper Page
    SCRAPER_RUNNING_STEPS: true,
    SCRAPER_STATS: true,

    // Card Manager Page
    CARD_MANAGER_COLLECTION: true,
    CARD_MANAGER_SEARCH: true,
  },

  // OCR
  OCR_API_URL: "http://localhost:3002/api/ocr/search",
  OCR_MODEL: "CLIP",
  OCR_SCORE_THRESHOLD: 0.8,
  OCR_LIMIT: 5,
  OCR_WORKERS: 2,
} as const;
