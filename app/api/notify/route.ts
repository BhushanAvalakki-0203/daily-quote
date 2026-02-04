import { NextResponse } from "next/server";
import { getPersistedDailyQuote } from "../../../lib/dailyStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const quote = await getPersistedDailyQuote(today);

    if (!quote) {
      return NextResponse.json(
        { error: "No daily quote found" },
        { status: 404 }
      );
    }

    // 🔔 PUSH (stub)
    console.log("🔔 Push notification:", quote.quote);

    // 📩 EMAIL (stub)
    console.log("📩 Email quote:", quote.quote);

    return NextResponse.json({
      status: "sent",
      quote: quote.quote,
      author: quote.person.name,
    });
  } catch (err) {
    console.error("[/api/notify] failed", err);
    return NextResponse.json(
      { error: "Notification failed" },
      { status: 500 }
    );
  }
}
