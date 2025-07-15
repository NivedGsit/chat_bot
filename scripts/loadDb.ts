import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenAI } from "@google/genai";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import dotenv from "dotenv";

dotenv.config();

const website_data = [
    'https://assentsteel.vercel.app/'
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

    const token = process.env.NEXT_PUBLIC_ASTRA_DB_APPLICATION_TOKEN
    const endpoint = process.env.NEXT_PUBLIC_ASTRA_DB_API_ENDPOINT

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
        process.env.NEXT_PUBLIC_ASTRA_DB_COLLECTION || "",
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

    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY });

    for await (const url of website_data) {
        const content = await scrapePage(url)
        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks) {
            const embedding = await ai.models.embedContent({
                model: 'models/embedding-001',
                contents: {
                    parts: [{ text: chunk }]
                }
            });

            if (embedding.embeddings) {
                const vector = embedding.embeddings[0]?.values

                const res = await collection.insertOne({
                    $vector: vector,
                    text: chunk
                })

               console.log(res)
            }

        }
    }
})();






