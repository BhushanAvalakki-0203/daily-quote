import "server-only";
import { kv } from "@vercel/kv";
import { fetchQuotesByAuthor } from "./fetchQuotes";
import { PERSONALITIES, toAuthorId, type Personality } from "./personalities";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const ROTATION_MINUTES = Number(process.env.DAILY_QUOTE_ROTATION_MINUTES ?? 1440);

export type DailyQuote = {
  rotationKey: string;
  person: { id: string; name: Personality };
  quote: string;
};

type FlatQuote = {
  id: string;
  personId: string;
  personName: Personality;
  quote: string;
};

export async function getRotatingQuote(): Promise<DailyQuote> {
  const rotationKey = getRotationKey();

  // 🔒 lock per rotation window
  const lockKey = `daily-quote:rotation:${rotationKey}`;
  const existing = await kv.get<DailyQuote>(lockKey);
  if (existing) return existing;

  const pool = await buildQuotePool();
  if (pool.length === 0) throw new Error("No quotes available");

  const used = (await kv.get<string[]>("daily-quote:used")) ?? [];
  let available = pool.filter(q => !used.includes(q.id));

  if (available.length === 0) {
    await kv.set("daily-quote:used", []);
    available = pool;
  }

  const picked = available[Math.floor(Math.random() * available.length)];

  const result: DailyQuote = {
    rotationKey,
    person: { id: picked.personId, name: picked.personName },
    quote: picked.quote,
  };

  await kv.set(lockKey, result);
  await kv.set("daily-quote:used", [...used, picked.id]);

  return result;
}

async function buildQuotePool(): Promise<FlatQuote[]> {
  const out: FlatQuote[] = [];
  for (const name of PERSONALITIES) {
    const quotes = await fetchQuotesByAuthor(name);
    const pid = toAuthorId(name);
    for (const q of quotes) {
      out.push({
        id: `${pid}:${q}`,
        personId: pid,
        personName: name,
        quote: q,
      });
    }
  }
  return out;
}

function getRotationKey(): string {
  const now = Date.now() + IST_OFFSET_MS;
  return `bucket:${Math.floor(now / (ROTATION_MINUTES * 60_000))}`;
}
