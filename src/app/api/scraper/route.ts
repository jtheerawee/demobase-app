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

export async function POST(request: Request) {
    let url: string = "";
    let type: string = "cards";
    let browser: any = null;
    let franchise: string | undefined;
    let language: string | undefined;
    let collectionId: number | string | undefined;

    try {
        let body: any = {};
        try {
            body = await request.json();
            url = body.url;
            type = body.type || "cards";
            franchise = body.franchise;
            language = body.language;
            collectionId = body.collectionId ? Number(body.collectionId) : undefined;
        } catch (e) {
            console.error("Failed to parse request body:", e);
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        if (!url && type === "collections") {
            if (franchise === "pokemon") {
                if (language === "th") {
                    url = APP_CONFIG.POKEMON_URL_TH;
                } else if (language === "jp") {
                    url = APP_CONFIG.POKEMON_URL_JP;
                } else {
                    url = APP_CONFIG.POKEMON_URL_EN;
                }
            } else if (franchise === "one-piece") {
                if (language === "jp") {
                    url = APP_CONFIG.ONEPIECE_URL_JP;
                } else {
                    url = APP_CONFIG.ONEPIECE_URL_EN;
                }
            } else if (franchise === "lorcana") {
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
                        } catch (_err) {}
                    };

                    try {
                        send({
                            type: "step",
                            message: "Launching browser engine...",
                        });
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

                        send({
                            type: "step",
                            message: "Creating browser context...",
                        });
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

                        if (url.includes("gatherer.wizards.com") || franchise === "mtg") {
                            if (type === "cards") {
                                await scrapeMTGCards(scraperOptions);
                            } else {
                                await scrapeMTGCollections(scraperOptions);
                            }
                        } else if (franchise === "pokemon") {
                            if (type === "cards") {
                                await scrapePokemonCards(scraperOptions);
                            } else {
                                await scrapePokemonCollections(scraperOptions);
                            }
                        } else if (franchise === "one-piece") {
                            if (type === "cards") {
                                await scrapeOnepieceCards(scraperOptions);
                            } else {
                                await scrapeOnepieceCollections(scraperOptions);
                            }
                        } else if (franchise === "lorcana") {
                            if (type === "cards") {
                                await scrapeLorcanaCards(scraperOptions);
                            } else {
                                await scrapeLorcanaCollections(scraperOptions);
                            }
                        } else {
                            send({
                                type: "step",
                                message: `Unsupported franchise: ${franchise}.`,
                            });
                        }

                        send({
                            type: "step",
                            message: "Scraping session finished successfully.",
                        });
                        send({
                            type: "complete",
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
                        } catch (_e) {}
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
