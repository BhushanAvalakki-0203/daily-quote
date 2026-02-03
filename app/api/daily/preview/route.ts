// app/api/daily/preview/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getTodaysQuote } from "../../../../lib/selectQuote";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const fakeDate = new Date(`${date}T00:00:00Z`);
  const quote = await getTodaysQuote(fakeDate);

  return NextResponse.json(quote);
}
