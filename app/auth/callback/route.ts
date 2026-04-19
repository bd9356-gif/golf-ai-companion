import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  // Pass the full URL with code to the client-side handler
  const code = requestUrl.searchParams.get("code");
  
  if (code) {
    // Redirect to a client-side page that can exchange the code properly
    return NextResponse.redirect(
      new URL(`/auth/confirm?code=${code}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/clubhouse", request.url));
}
