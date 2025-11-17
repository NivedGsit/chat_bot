import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import * as jose from "jose";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;


  response.headers.set("Access-Control-Allow-Origin", "https://docs-rho-wine.vercel.app");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Define protected routes
  const isProtectedRoute = path.startsWith("/admin") && !path.includes("/admin/login");
console.log(isProtectedRoute);
  if (isProtectedRoute) {
    const token = request.cookies.get("adminToken")?.value || "";

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
      await jose.jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      console.log(error);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
