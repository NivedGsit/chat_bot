import { NextRequest, NextResponse } from "next/server";
import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import OpenAI from "openai";

function connectToDatabase(): Db {
  const token = process.env.NEXT_PUBLIC_ASTRA_DB_APPLICATION_TOKEN;
  const endpoint = process.env.NEXT_PUBLIC_ASTRA_DB_API_ENDPOINT;

  if (!token || !endpoint) {
    throw new Error(
      "Environment variables API_ENDPOINT and APPLICATION_TOKEN must be defined."
    );
  }

  const client = new DataAPIClient();
  const database = client.db(endpoint, { token });

  console.log(`Connected to database ${database.id}`);
  return database;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const latestMessage = body.messages[body.messages.length - 1];


    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Step 1: Create embedding for the latest message
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage.content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Step 2: Query Astra DB
    const db = connectToDatabase();
    const collection = db.collection(
      process.env.NEXT_PUBLIC_ASTRA_DB_COLLECTION || ""
    );

let filter = {};

if (/service|engineering|fabrication|blasting|erection/i.test(latestMessage.content)) {
  filter = { category: "service" };
}

const cursor = collection.find(
  filter,
  {
    sort: {
      $vector: embedding,
    },
    limit: 10,
  }
);


    const documents = await cursor.toArray();
    console.log("Fetched documents from DB");

    const docsMap = documents.map((doc) => ({
      text: doc.text,
      source: doc.source,
    }));

    const docsTextOnly = docsMap.map((d) => d.text).join("\n\n");

    const userWantsLink = /\b(link|url|website|page)\b/i.test(
      latestMessage.content
    );

    let contextPrompt = `
You are an AI assistant with access to verified company information extracted from their official website.
Use it to answer the user's question naturally and concisely.
Do not mention internal data sources.
`;

    if (userWantsLink) {
      const formattedSources = docsMap
        .map(
          (d) =>
            `- <a href="${d.source}" target="_blank" rel="noopener noreferrer">${d.source}</a>`
        )
        .join("\n");

      contextPrompt += `
Relevant information:
${docsTextOnly}

You may also share these useful links if relevant:
${formattedSources}
`;
    } else {
      contextPrompt += `
Relevant information:
${docsTextOnly}
`;
    }

    contextPrompt += `

User question:
${latestMessage.content}
`;

    // Step 3: Generate answer using GPT
    const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: `
You are an AI assistant for Assent Steel.

SPECIAL RULES FOR SERVICES:
- If the user asks about “services”, “what do you offer”, “what are your services”, “solutions”, or anything similar:
  ALWAYS answer strictly with the official list of services:

  • Engineering
  • Fabrication
  • Blasting & Painting
  • Steel Erection

- Ignore retrieval results for these questions.
- Output only clean HTML (<p>, <ul>, <li>, <b>, etc.)

GENERAL RULES:
1. Use only the information inside the <websiteContext> block unless a SPECIAL RULE applies.
2. Never guess or hallucinate.
3. Never extract or show links from raw HTML text.
4. Only use "source" values as valid URLs.
5. Show links in the format:
   <a href="{URL}" target="_blank" rel="noopener noreferrer">{URL}</a>
6. Avoid duplicates.
7. When the user asks about “location” or “address” without a project name:
   ALWAYS return the company’s head office address.
8. If unclear, ask a clarifying question.


Always behave like a professional website assistant.
`
    },
    {
      role: "user",
      content: contextPrompt
    }
  ]
});


    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      role: "assistant",
      content: answer,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Something went wrong.", details: String(error) },
      { status: 500 }
    );
  }
}
