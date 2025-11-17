import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

type Doc = { $vector: number[]; text: string; source: string };

const website_data = [
  "https://assentsteel.vercel.app/",
  "https://assentsteel.vercel.app/about",
  "https://assentsteel.vercel.app/team",
  "https://assentsteel.vercel.app/accreditations",
  "https://assentsteel.vercel.app/contact-us",
  "https://assentsteel.vercel.app/news",
  "https://assentsteel.vercel.app/projects-list",
  "https://assentsteel.vercel.app/careers",
  "https://assentsteel.vercel.app/engineering",
  "https://assentsteel.vercel.app/fabrication",
  "https://assentsteel.vercel.app/blasting",
  "https://assentsteel.vercel.app/services",
];

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });
  return (await loader.scrape())?.replace(/<[^>]*>/gm, "");
};

// ✅ Connect to Astra DB
export function connectToDatabase(): Db {
  const token = "AstraCS:NzpCukwgABCDHpMBMNhIvJHT:2c5bd4c44613d609068f2350aba4edfa463b2e70ea0bd64469e4d864b34c2048";
  const endpoint = "https://c44f0eb7-ac81-4c1e-86ac-3c390f8d27d0-us-east-2.apps.astra.datastax.com";

  if (!token || !endpoint) {
    throw new Error("Missing Astra DB credentials");
  }

  const client = new DataAPIClient();
  const database = client.db(endpoint, { token });
  console.log(`Connected to database ${database.id}`);
  return database;
}

(async function () {
  const database = connectToDatabase();

  // ✅ Create collection with 1536 dimensions (OpenAI’s text-embedding-3-small)
  const collection = await database.createCollection("website_data", {
    vector: { dimension: 1536, metric: "cosine" },
  });

  console.log(`Created collection ${collection.keyspace}.${collection.name}`);

  const openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
  });

  async function processWithLimit(
    urls: string[],
    limit: number,
    fn: (url: string) => Promise<string | null>
  ) {
    const results: { url: string; content: string | null }[] = [];
    for (let i = 0; i < urls.length; i += limit) {
      const batch = urls.slice(i, i + limit);
      const res = await Promise.all(
        batch.map(async (url) => {
          const content = await fn(url);
          return { url, content };
        })
      );
      results.push(...res);
    }
    return results;
  }

  const pages = await processWithLimit(website_data, 2, scrapePage);

  for (let i = 0; i < pages.length; i++) {
    const { url, content } = pages[i];
    if (!content) continue;

    const chunks = await splitter.splitText(content);

    // ✅ Create embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small", // 1536 dimensions
          input: chunk,
        });
        return response.data[0].embedding;
      })
    );

    // ✅ Prepare documents for batch insert
    const docs: Doc[] = embeddings.map((vector, idx) => ({
      $vector: vector,
      text: chunks[idx],
      source: url,
    }));

    if (docs.length) {
      const res = await collection.insertMany(docs);
      console.log(`Inserted ${docs.length} chunks from ${url}`, res);
    }
  }
})();
