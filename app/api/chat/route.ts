import { NextRequest, NextResponse } from "next/server"
import { DataAPIClient, Db } from "@datastax/astra-db-ts";
import { GoogleGenAI } from "@google/genai";

function connectToDatabase(): Db {

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


export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const latestMessage = body.messages[body.messages.length - 1]

        console.log(latestMessage)

        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY });
        const embedding = await ai.models.embedContent({
            model: 'models/embedding-001',
            contents: {
                parts: [{ text: latestMessage.content }]
            }
        });


        try {
            const db = connectToDatabase()
            const collection = db.collection(process.env.NEXT_PUBLIC_ASTRA_DB_COLLECTION || "")
            if (embedding.embeddings) {
                const cursor = collection.find({}, {
                    sort: {
                        $vector: embedding.embeddings[0]?.values || ""
                    },
                    limit: 10
                })

                const documents = await cursor.toArray(); // ✅ await here
                console.log("here");

                const docsMap = documents.map((doc) => ({
                    text: doc.text,
                    source: doc.source
                  }));
                  const docsTextOnly = docsMap.map(d => d.text).join("\n\n");
                  
                  const userWantsLink = /\b(link|url|website|page)\b/i.test(latestMessage.content);
                  
                  let contextPrompt = `
                  You are an assistant with access to the following company information extracted from their website.
                  Use it to answer the user's question naturally and concisely.
                  Do not mention that you are using internal data.
                  `;
                  
                  // 🔗 If user asks for links, format them in a conversational way
                  if (userWantsLink) {
                    const formattedSources = docsMap
                    .map(d => `- <a href="${d.source}" target="_blank" rel="noopener noreferrer>${d.source}</a>`)
                      .join("\n");
                  
                    contextPrompt += `
                  Relevant information:
                  ${docsTextOnly}
                  
                  When answering, you may also share these useful links if relevant:
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
                  


                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash", // or "gemini-pro"
                    contents: {
                        parts: [{ text: contextPrompt }]
                    },
                });

                const answer = response.text;

                return NextResponse.json({
                    role: "assistant",
                    content: answer,
                });


            }


            //             for await (const document of cursor) {
            //     console.log(document);
            //   }











        } catch (error) {
            console.log("Error quering db...", error)
        }



    } catch (error) {
        console.log(error)
    }
}