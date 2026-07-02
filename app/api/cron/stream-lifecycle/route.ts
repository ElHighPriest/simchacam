import { NextRequest, NextResponse } from "next/server";
import { cleanupStreamLifecycle } from "@/lib/stream-lifecycle";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearerToken === secret || headerSecret === secret;
}

async function handleCron(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await cleanupStreamLifecycle();

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Could not clean up expired stream sessions", error);
    return NextResponse.json(
      { error: "Could not clean up stream sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}
