import "server-only";

/**
 * Fetch quotes by author name using a public quote API.
 *
 * We intentionally DO NOT scrape random websites.
 *
 * Current provider: Quotable (https://api.quotable.io)
 * - Limitation: author name matching and attribution accuracy depend on the provider's dataset.
 * - Future improvement: support multiple providers + per-personality aliasing/fallbacks.
 */

type CacheEntry = Readonly<{
  fetchedAtMs: number;
  quotes: ReadonlyArray<string>;
}>;

// In-memory cache (best-effort). In serverless/edge environments this may not persist
// across cold starts, so treat it as an optimization, not a guarantee.
const memCache: Map<string, CacheEntry> = new Map();

export async function fetchQuotesByAuthor(authorName: string): Promise<string[]> {
  const key = authorName.trim().toLowerCase();

  // Basic cache: keep results for 24 hours.
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
      // Next.js fetch cache hint: cache for 24h (best-effort, platform-dependent).
      // This keeps it server-only and avoids client-side fetching.
      next: { revalidate: 24 * 60 * 60 },
    });

    if (!res.ok) {
      // Graceful failure: return empty list. Caller decides how to handle "no quotes".
      return [];
    }

    const data: unknown = await res.json();
    const quotes = parseQuotableQuotesResponse(data);

    memCache.set(key, { fetchedAtMs: now, quotes });
    return [...quotes];
  } catch {
    // Network / JSON parsing errors: fail gracefully.
    return [];
  }
}

function parseQuotableQuotesResponse(input: unknown): string[] {
  // Expected (simplified):
  // { results: [{ content: string, author: string, ... }], ... }
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

