import { NextResponse } from "next/server";
import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient("AstraCS:NzpCukwgABCDHpMBMNhIvJHT:2c5bd4c44613d609068f2350aba4edfa463b2e70ea0bd64469e4d864b34c2048");
const database = client.db("https://c44f0eb7-ac81-4c1e-86ac-3c390f8d27d0-us-east-2.apps.astra.datastax.com");
const collection = database.collection("website_data");

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
