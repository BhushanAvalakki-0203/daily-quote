import "server-only";
import { kv } from "@vercel/kv";
import { inferMood, type Mood } from "./mood";
import type { DailyQuote } from "./selectQuote";

export type PersistedDailyQuote = DailyQuote & { mood: Mood };

export async function ensurePersistedDailyQuote(
  selectDaily: () => Promise<DailyQuote>,
): Promise<PersistedDailyQuote> {
  const candidate = await selectDaily();
  const key = `daily-quote:${candidate.rotationKey}`;

  const existing = await kv.get<PersistedDailyQuote>(key);
  if (existing) return existing;

  const persisted: PersistedDailyQuote = {
    ...candidate,
    mood: inferMood(candidate.quote),
  };

  await kv.set(key, persisted);
  return persisted;
}

export async function getPersistedDailyQuote(
  rotationKey: string,
): Promise<PersistedDailyQuote | null> {
  return (await kv.get(`daily-quote:${rotationKey}`)) ?? null;
}
