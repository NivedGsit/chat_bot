import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import connectDB from "@/lib/mongodb";
import { cookies } from "next/headers";
import Admin from "@/models/Admin";

export async function POST(request: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();

    const { username, password } = await request.json();

    // Find admin user
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
    const token = await new jose.SignJWT({ userId: admin._id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    //set the token in the cookie
    cookieStore.set("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 1 day
    });

    return NextResponse.json({ success: true, data: "" }, { status: 200 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
