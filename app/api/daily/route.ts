export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getRotatingQuote } from "../../../lib/selectQuote";

export async function GET() {
  try {
    const quote = await getRotatingQuote();
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to generate quote" },
      { status: 500 },
    );
  }
}
