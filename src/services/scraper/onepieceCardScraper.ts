import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ONE PIECE CARD SCRAPER LOGIC
// ==========================================
// Load the page once, then click each card anchor to open the fancybox modal.
// The card URL is assigned as baseUrl#group_1-N based on click order.
// Stop when modal has no valid card data.

export async function scrapeOnepieceCards({
  url,
  context,
  collectionId,
  send,
}: ScraperOptions) {
  const cards: any[] = [];
  const baseUrl = url.split("#")[0];

  send({ type: "step", message: "Initializing One Piece card scraper..." });

  const page = await context.newPage();
  try {
    send({ type: "step", message: `Loading: ${baseUrl}` });
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);

    // Discover total card count using a cascade of fancybox selector patterns
    const totalAnchors = await page.evaluate(() => {
      const candidates: [string, number][] = [
        ["a[data-fancybox]", document.querySelectorAll("a[data-fancybox]").length],
        ['a[data-src^="#"]', document.querySelectorAll('a[data-src^="#"]').length],
        ["dl a", document.querySelectorAll("dl a").length],
      ];
      const [, count] = candidates.find(([, n]) => n > 0) ?? ["", 0];
      return count;
    });

    if (totalAnchors === 0) {
      send({ type: "step", message: "⚠️ No card anchors found on page." });
      return;
    }

    send({ type: "step", message: `Found ${totalAnchors} cards. Scraping...` });

    for (let N = 1; N <= totalAnchors; N++) {
      const cardUrl = `${baseUrl}#group_1-${N}`;

      // Click the Nth anchor to trigger fancybox
      const clicked = await page.evaluate(({ idx, candidates }: { idx: number; candidates: string[] }) => {
        for (const sel of candidates) {
          const anchors = document.querySelectorAll(sel);
          const el = anchors[idx] as HTMLElement | undefined;
          if (el) { el.click(); return true; }
        }
        return false;
      }, { idx: N - 1, candidates: ["a[data-fancybox]", 'a[data-src^="#"]', "dl a"] });

      if (!clicked) {
        send({ type: "step", message: `[${N}] Could not click anchor — stopping.` });
        break;
      }

      // Wait for modal to be visible
      try {
        await page.waitForSelector(
          ".fancybox-slide--current .cardDetail, .fancybox-content, .fancybox-inner",
          { state: "visible", timeout: 10000 }
        );
      } catch {
        send({ type: "step", message: `[${N}] No modal appeared — stopping.` });
        break;
      }

      // Wait until infoCol has pipe-separated rarity data
      try {
        await page.waitForFunction(
          () => {
            const info = document.querySelector(
              ".fancybox-slide--current .infoCol, .fancybox-slide--current .info_col," +
              ".fancybox-content .infoCol, .fancybox-content .info_col"
            );
            return !!info?.textContent?.includes("|");
          },
          { timeout: 5000 }
        );
      } catch {
        /* some cards may not have infoCol — continue */
      }

      // Scrape card data from the open modal
      const details = await page.evaluate(() => {
        const modal =
          document.querySelector(".fancybox-slide--current .cardDetail") ||
          document.querySelector(".fancybox-content") ||
          document.querySelector(".fancybox-inner");
        if (!modal) return null;

        const name =
          modal.querySelector(".cardName, .name, h2, h3")?.textContent?.trim() || "";

        // Rarity from pipe-separated infoCol
        let rarity = "";
        const infoCol = modal.querySelector(".infoCol, .info_col");
        if (infoCol) {
          const parts = (infoCol.textContent || "")
            .split("|")
            .map((p: string) => p.trim());
          if (parts.length >= 2) rarity = parts[1];
        }
        if (!rarity) {
          const m = (modal.textContent || "").match(/\b(L|SEC|SR|R|UC|C|P)\b/);
          if (m) rarity = m[1];
        }

        // Image URL → cardNo
        const imgEl = modal.querySelector("img") as HTMLImageElement | null;
        const rawSrc = imgEl?.getAttribute("data-src") || imgEl?.src || "";
        let imageUrl = "";
        if (rawSrc) {
          try {
            imageUrl = new URL(rawSrc, window.location.href).href;
          } catch {
            imageUrl = rawSrc;
          }
          imageUrl = imageUrl.split("?")[0].replace(/_p\d+\./, ".");
        }

        let cardNo = "N/A";
        const filename = imageUrl ? (imageUrl.split("/").pop()?.split("?")[0] || "") : "";
        if (filename) {
          const m = filename.match(/([A-Z]{1,4}\d*-\d+)/i);
          if (m) cardNo = m[1].toUpperCase();
        }

        return { name, cardNo, rarity, imageUrl, debugFilename: filename };
      });

      // Stop when modal has no valid card data
      if (!details || details.cardNo === "N/A" || !details.rarity) {
        send({
          type: "step",
          message: `[${N}] Invalid data — stopping. (cardNo="${details?.cardNo}", rarity="${details?.rarity}", file="${details?.debugFilename}")`,
        });
        break;
      }

      const { debugFilename, ...cardDetails } = details;
      cards.push({ ...cardDetails, cardUrl, isDeepScraped: true, isBeingScraped: false });
      send({ type: "step", message: `[${N}/${totalAnchors}] ${details.cardNo}: ${details.name} | Rarity="${details.rarity}"` });

      // Close modal before clicking next card
      const closed = await page.evaluate(() => {
        const btn = document.querySelector(
          ".fancybox-close-small, .fancybox-button--close, [data-fancybox-close]"
        ) as HTMLElement | null;
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (!closed) await page.keyboard.press("Escape");
      await page.waitForTimeout(APP_CONFIG.SCRAPER_PAGE_LOAD_DELAY_MS);
    }

    // Dedup by cardNo — variants share the same cardNo as the base card
    const seenNos = new Set<string>();
    const uniqueCards = cards.filter((c) => {
      if (seenNos.has(c.cardNo)) return false;
      seenNos.add(c.cardNo);
      return true;
    });
    const variants = cards.length - uniqueCards.length;

    send({
      type: "step",
      message: `✅ Scraped ${cards.length} cards (${variants} variants skipped).`,
    });
    send({ type: "chunk", items: uniqueCards, startIndex: 0 });

    if (collectionId && uniqueCards.length > 0) {
      send({
        type: "step",
        message: `Final Step: Persisting ${uniqueCards.length} cards to database...`,
      });
      const result = await saveScrapedCards(uniqueCards, collectionId);
      if (result) {
        const { added, matched } = result;
        send({ type: "stats", category: "cards", added, matched, missed: 0 });
        send({
          type: "step",
          message: `✨ Scrape Complete! Saved ${uniqueCards.length} cards — ✅ ${added} new, 🔁 ${matched} matched.`,
        });
      }
    } else if (cards.length === 0) {
      send({ type: "step", message: "Scrape finished with 0 cards." });
    }
  } finally {
    await page.close();
  }
}
