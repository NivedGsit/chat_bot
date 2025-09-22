import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenAI } from "@google/genai";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import dotenv from "dotenv";

type Doc = { $vector: number[]; text: string; source: string };

dotenv.config();

const website_data = [
    'https://assentsteel.vercel.app/',
    'https://assentsteel.vercel.app/about',
    'https://assentsteel.vercel.app/team',
    'https://assentsteel.vercel.app/accreditations',
    'https://assentsteel.vercel.app/contact-us',
    'https://assentsteel.vercel.app/news',
    'https://assentsteel.vercel.app/projects-list',
    'https://assentsteel.vercel.app/careers'
]

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
})

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML)
            await browser.close()
            return result
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>/gm, '')
}


export function connectToDatabase(): Db {

    const token = "AstraCS:NzpCukwgABCDHpMBMNhIvJHT:2c5bd4c44613d609068f2350aba4edfa463b2e70ea0bd64469e4d864b34c2048"
    const endpoint = "https://c44f0eb7-ac81-4c1e-86ac-3c390f8d27d0-us-east-2.apps.astra.datastax.com"

    console.log(token)

    if (!token || !endpoint) {
        throw new Error(
            "Environment variables API_ENDPOINT and APPLICATION_TOKEN must be defined.",
        );
    }

    // Create an instance of the `DataAPIClient` class
    const client = new DataAPIClient();

    // Get the database specified by your endpoint and provide the token
    const database = client.db(endpoint, { token });

    console.log(`Connected to database ${database.id}`);

    return database;
}

(async function () {
    const database = connectToDatabase();

    const collection = await database.createCollection(
        "website_data",
        {
            vector: {
                dimension: 768,
                metric: "cosine",
            },
        },
    );

    console.log(
        `Created collection ${collection.keyspace}.${collection.name}`,
    );

    const ai = new GoogleGenAI({ apiKey: "AIzaSyBmjoigDQc4IPOYC1nX8sW2FDQhJB--0XI" });

    const pages = await Promise.all(
        website_data.map(url => scrapePage(url))
    );

    for (let i = 0; i < pages.length; i++) {
        const url = website_data[i];
        const content = pages[i];
        const chunks = await splitter.splitText(content);

        // Create embeddings for all chunks in parallel
        const embeddings = await Promise.all(
            chunks.map(chunk =>
                ai.models.embedContent({
                    model: "models/embedding-001",
                    contents: { parts: [{ text: chunk }] },
                })
            )
        );

        // Prepare documents for batch insert
        const docs: Doc[] = embeddings
            .map((embedding, idx) => {
                const vector = embedding.embeddings?.[0]?.values;
                if (!vector) return null;
                return {
                    $vector: vector,
                    text: chunks[idx],
                    source: url,
                };
            })
            .filter((doc): doc is Doc => doc !== null);

        // Insert all docs at once
        if (docs.length) {
            const res = await collection.insertMany(docs);
            console.log(`Inserted ${docs.length} chunks from ${url}`, res);
        }
    }
})();






