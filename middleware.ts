import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Daftar public API routes yang tidak perlu auth
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware untuk public API routes
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Cek token dari cookie atau Authorization header
  const token = 
    req.cookies.get("auth_token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    // Untuk API routes, return JSON error
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }
    // Untuk pages, redirect ke login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    
    // Tambahkan user info ke headers untuk API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", decoded.userId || "");
    requestHeaders.set("x-user-email", decoded.email || "");
    requestHeaders.set("x-user-role", decoded.role || "");
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("[MIDDLEWARE ERROR]", error);
    
    // Hapus cookie yang invalid
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("auth_token");
    
    // Untuk API routes, return JSON error
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Token tidak valid" },
        { status: 401 }
      );
    }
    
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/products/:path*",
    "/transactions/:path*",
    "/reports/:path*",
  ],
};