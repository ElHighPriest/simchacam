import { NextResponse, type NextRequest } from "next/server";

function prefersHebrew(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  const acceptLanguage = request.headers
    .get("accept-language")
    ?.toLowerCase();

  return country === "IL" || Boolean(acceptLanguage?.includes("he"));
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = prefersHebrew(request) ? "/he" : "/en";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/",
};
