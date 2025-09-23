import { NextResponse } from "next/server";
import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
const database = client.db(process.env.ASTRA_DB_API_ENDPOINT!);
const collection = database.collection(process.env.ASTRA_DB_COLLECTION!);

export async function GET() {
  try {
    // Ping the DB (just get one doc instead of all for efficiency)
    const doc = await collection.findOne({});

    return NextResponse.json({
      success: true,
      message: "Pinged Astra DB successfully",
      doc,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err },
      { status: 500 }
    );
  }
}
