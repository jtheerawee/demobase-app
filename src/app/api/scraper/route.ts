import { NextResponse } from "next/server";
import { chromium as playwright } from "playwright";
import { APP_CONFIG } from "@/constants/app";
import { scrapeMTGCards, scrapeMTGCollections } from "@/services/scraper/mtg/mtgScraper";
import { scrapeOnepieceCards, scrapeOnepieceCollections } from "@/services/scraper/onepiece/onepieceScraper";
import { scrapePokemonCards, scrapePokemonCollections } from "@/services/scraper/pokemon/pokemonScraper";
import {
    scrapeTCGPlayerCards as scrapeLorcanaCards,
    scrapeTCGPlayerCollections as scrapeLorcanaCollections,
} from "@/services/scraper/tcgplayer/tcgPlayerScraper";
import { createStepLogger } from "@/services/scraper/utils";
import { SCRAPER_MESSAGE_TYPE, SCRAPER_TYPE } from "@/services/scraper/types";
import { FRANCHISES, FRANCHISE_INDEX } from "@/constants/franchises";

export async function POST(request: Request) {
    let url: string = "";
    let type: string = SCRAPER_TYPE.CARDS;
    let browser: any = null;
    let franchise: string | undefined;
    let language: string | undefined;
    let collectionId: number | string | undefined;

    try {
        let body: any = {};
        try {
            body = await request.json();
            url = body.url;
            type = body.type || SCRAPER_TYPE.CARDS;
            franchise = body.franchise;
            language = body.language;
            collectionId = body.collectionId ? Number(body.collectionId) : undefined;
        } catch (e) {
            console.error("Failed to parse request body:", e);
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        if (!url && type === SCRAPER_TYPE.COLLECTIONS) {
            if (franchise === FRANCHISES[FRANCHISE_INDEX.POKEMON].value) {
                if (language === "th") {
                    url = APP_CONFIG.POKEMON_URL_TH;
                } else if (language === "jp") {
                    url = APP_CONFIG.POKEMON_URL_JP;
                } else {
                    url = APP_CONFIG.POKEMON_URL_EN;
                }
            } else if (franchise === FRANCHISES[FRANCHISE_INDEX.ONEPIECE].value) {
                if (language === "jp") {
                    url = APP_CONFIG.ONEPIECE_URL_JP;
                } else {
                    url = APP_CONFIG.ONEPIECE_URL_EN;
                }
            } else if (franchise === FRANCHISES[FRANCHISE_INDEX.LORCANA].value) {
                url = APP_CONFIG.LORCANA_URL_EN;
            } else {
                url = APP_CONFIG.MTG_URL_EN;
            }
        }


        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const deepScrape = body.deepScrape !== false;
        const skipSave = body.skipSave === true;
        const encoder = new TextEncoder();

        return new Response(
            new ReadableStream({
                async start(controller) {
                    const send = (data: unknown) => {
                        try {
                            controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
                        } catch (_err) { }
                    };

                    const logStep = createStepLogger(send);

                    try {
                        logStep("Launching browser engine...");

                        try {
                            browser = await playwright.launch({
                                args: [
                                    "--no-sandbox",
                                    "--disable-setuid-sandbox",
                                    "--disable-blink-features=AutomationControlled",
                                ],
                                headless: true,
                            });
                        } catch (launchError: any) {
                            console.error("[Scraper Launch Error]:", launchError);
                            send({
                                success: false,
                                error: `Failed to launch browser: ${launchError.message}`,
                                tip: "Make sure to run 'npm install playwright' and 'npx playwright install chromium'.",
                            });
                            controller.close();
                            return;
                        }

                        logStep("Creating browser context...");

                        const context = await browser.newContext({
                            userAgent:
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        });

                        const cardLimit = body.cardLimit ? Number(body.cardLimit) : undefined;

                        const tcgUrlOnly = body.tcgUrlOnly === true;

                        const scraperOptions = {
                            url,
                            type,
                            deepScrape,
                            context,
                            send,
                            franchise,
                            language,
                            collectionId,
                            skipSave,
                            cardLimit,
                            tcgUrlOnly,
                        };

                        const mtgValue = FRANCHISES[FRANCHISE_INDEX.MTG].value;
                        const pokemonValue = FRANCHISES[FRANCHISE_INDEX.POKEMON].value;
                        const onepieceValue = FRANCHISES[FRANCHISE_INDEX.ONEPIECE].value;
                        const lorcanaValue = FRANCHISES[FRANCHISE_INDEX.LORCANA].value;


                        if (url.includes("gatherer.wizards.com") || franchise === mtgValue) {
                            if (type === SCRAPER_TYPE.CARDS) {
                                await scrapeMTGCards(scraperOptions);
                            } else {
                                await scrapeMTGCollections(scraperOptions);
                            }
                        } else if (franchise === pokemonValue) {
                            if (type === SCRAPER_TYPE.CARDS) {
                                await scrapePokemonCards(scraperOptions);
                            } else {
                                await scrapePokemonCollections(scraperOptions);
                            }
                        } else if (franchise === onepieceValue) {
                            if (type === SCRAPER_TYPE.CARDS) {
                                await scrapeOnepieceCards(scraperOptions);
                            } else {
                                await scrapeOnepieceCollections(scraperOptions);
                            }
                        } else if (franchise === lorcanaValue) {
                            if (type === SCRAPER_TYPE.CARDS) {
                                await scrapeLorcanaCards(scraperOptions);
                            } else {
                                await scrapeLorcanaCollections(scraperOptions);
                            }
                        } else {
                            logStep(`Unsupported franchise: ${franchise}.`);
                        }

                        logStep("Scraping session finished successfully.");
                        send({
                            type: SCRAPER_MESSAGE_TYPE.COMPLETE,
                            success: true,
                        });
                    } catch (error: any) {
                        console.error("[Scrapper Stream Error]:", error);
                        send({
                            success: false,
                            error: error.message || "Unknown scraping error",
                        });
                    } finally {
                        if (browser) {
                            await browser.close();
                        }
                        try {
                            controller.close();
                        } catch (_e) { }
                    }
                },
            }),
            {
                headers: {
                    "Content-Type": "application/x-ndjson",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            },
        );
    } catch (error: any) {
        console.error("[Scraper Generic Error]:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Unknown scraping error",
            },
            { status: 500 },
        );
    }
}
