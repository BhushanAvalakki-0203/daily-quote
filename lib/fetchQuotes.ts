import "server-only";

/**
 * Fetch quotes by author name using a public quote API.
 *
 * Provider: Quotable (https://api.quotable.io)
 *
 * IMPORTANT:
 * - We explicitly disable Next.js fetch caching (`cache: "no-store"`)
 * - Determinism is handled at the quote-selection layer, not here
 */

type CacheEntry = Readonly<{
  fetchedAtMs: number;
  quotes: ReadonlyArray<string>;
}>;

// Best-effort in-memory cache (may reset on cold starts)
const memCache: Map<string, CacheEntry> = new Map();

export async function fetchQuotesByAuthor(authorName: string): Promise<string[]> {
  const key = authorName.trim().toLowerCase();

  // Keep results for 24 hours in memory
  const ttlMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const cached = memCache.get(key);
  if (cached && now - cached.fetchedAtMs < ttlMs) {
    return [...cached.quotes];
  }

  try {
    const url = new URL("https://api.quotable.io/quotes");
    url.searchParams.set("author", authorName);
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString(), {
      // 🔥 CRITICAL FIX:
      // Disable Next.js fetch cache completely
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data: unknown = await res.json();
    const quotes = parseQuotableQuotesResponse(data);

    memCache.set(key, {
      fetchedAtMs: now,
      quotes,
    });

    return [...quotes];
  } catch (err) {
    console.error("[fetchQuotesByAuthor] failed", err);
    return [];
  }
}

function parseQuotableQuotesResponse(input: unknown): string[] {
  if (!isRecord(input)) return [];

  const results = input["results"];
  if (!Array.isArray(results)) return [];

  const out: string[] = [];

  for (const item of results) {
    if (!isRecord(item)) continue;
    const content = item["content"];
    if (typeof content === "string") {
      const q = content.trim();
      if (q.length > 0) out.push(q);
    }
  }

  return dedupe(out);
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}