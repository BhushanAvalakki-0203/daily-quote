// lib/fetchQuotes.ts
import "server-only";

/**
 * External quote fetcher (best-effort).
 * MUST NEVER crash the app.
 */

const FALLBACK_QUOTES: Record<string, string[]> = {
  "Steve Jobs": [
    "Innovation distinguishes between a leader and a follower.",
    "Stay hungry, stay foolish.",
    "Your time is limited, so don’t waste it living someone else’s life.",
  ],
  "Cristiano Ronaldo": [
    "Talent without working hard is nothing.",
    "Your love makes me strong, your hate makes me unstoppable.",
  ],
  "Michael Phelps": [
    "You can’t put a limit on anything.",
    "If you want to be the best, you have to do things others aren’t willing to do.",
  ],
};

export async function fetchQuotesByAuthor(author: string): Promise<string[]> {
  try {
    const url = new URL("https://api.quotable.io/quotes");
    url.searchParams.set("author", author);
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      return FALLBACK_QUOTES[author] ?? [];
    }

    const data = (await res.json()) as {
      results?: { content?: string }[];
    };

    const quotes =
      data.results
        ?.map((r) => r.content)
        .filter((q): q is string => typeof q === "string") ?? [];

    return quotes.length > 0 ? quotes : FALLBACK_QUOTES[author] ?? [];
  } catch {
    // 🚨 NEVER throw
    return FALLBACK_QUOTES[author] ?? [];
  }
}
