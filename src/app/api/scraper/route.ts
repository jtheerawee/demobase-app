import { NextResponse } from "next/server";
import { chromium as playwright } from "playwright";
import { APP_CONFIG } from "@/constants/app";
import { scrapeMTGCards, scrapeMTGCollections } from "@/services/scraper/mtgScraper";
import { createClient } from "@/utils/supabase/server";

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
            collectionId = body.collectionId;
        } catch (e) {
            console.error("Failed to parse request body:", e);
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        if (!url && type === "collections") {
            url = APP_CONFIG.MTG_URL_EN;
        }

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const deepScrape = body.deepScrape !== false;
        const encoder = new TextEncoder();

        return new Response(
            new ReadableStream({
                async start(controller) {
                    const send = (data: unknown) => {
                        try {
                            controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
                        } catch (_err) { }
                    };

                    try {
                        send({ type: "step", message: "Launching browser engine..." });
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

                        send({ type: "step", message: "Creating browser context..." });
                        const context = await browser.newContext({
                            userAgent:
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        });

                        let scrapedIndex = 0;
                        if (type === "collections" && franchise && language) {
                            send({ type: "step", message: "Determining next scraping index..." });
                            const supabase = await createClient();
                            const { data } = await supabase
                                .from("scraped_collections")
                                .select("scraped_index")
                                .eq("franchise", franchise)
                                .eq("language", language)
                                .order("scraped_index", { ascending: false })
                                .limit(1);

                            scrapedIndex = data && data.length > 0 ? (data[0].scraped_index ?? -1) + 1 : 1;
                            send({
                                type: "step",
                                message: `Iteration Index: ${scrapedIndex} (Franchise: ${franchise}, Language: ${language})`,
                            });
                        }

                        const scraperOptions = {
                            url,
                            type,
                            deepScrape,
                            context,
                            send,
                            franchise,
                            language,
                            scrapedIndex,
                            collectionId,
                        };

                        if (url.includes("gatherer.wizards.com")) {
                            if (type === "cards") {
                                await scrapeMTGCards(scraperOptions);
                            } else {
                                await scrapeMTGCollections(scraperOptions);
                            }
                        } else {
                            send({ type: "step", message: "Unsupported URL. Only MTG Gatherer is currently implemented." });
                        }

                        send({ type: "step", message: "Scraping session finished successfully." });
                        send({ type: "complete", success: true });
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
            }
        );
    } catch (error: any) {
        console.error("[Scraper Generic Error]:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Unknown scraping error",
            },
            { status: 500 }
        );
    }
}
