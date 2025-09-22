import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

const crawlWebsite = async (url: string, visited = new Set<string>()): Promise<string[]> => {
    if (visited.has(url)) return [];
    visited.add(url);

    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: { headless: true },
        gotoOptions: { waitUntil: "domcontentloaded" },
        evaluate: async (page, browser) => {
            const html = await page.evaluate(() => document.documentElement.outerHTML);
            await browser.close();
            return html;
        }
    });

    const html = await loader.scrape();
    const text = html?.replace(/<[^>]*>/gm, '') || "";

    // Extract links
    const links = [...html.matchAll(/href="([^"]+)"/g)]
        .map(m => m[1])
        .filter(href => href.startsWith("/") || href.startsWith(url)) // same domain only
        .map(href => href.startsWith("/") ? new URL(href, url).href : href);

    // Recursively crawl child pages
    for (const link of links) {
        if (!visited.has(link)) {
            await crawlWebsite(link, visited);
        }
    }

    return Array.from(visited);
};


(async () => {
    const allUrls = await crawlWebsite("https://assentsteel.vercel.app/");
    console.log(allUrls);
  })();

