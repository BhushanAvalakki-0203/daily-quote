// app/page.tsx

export const dynamic = "force-dynamic";

import { Background3D } from "../components/Background3D";
import { QuoteCard } from "../components/QuoteCard";

import { getThemeByAuthor } from "../lib/themes";
import {
  getPersistedDailyQuote,
  ensurePersistedDailyQuote,
} from "../lib/dailyStore";
import { getTodaysQuote } from "../lib/selectQuote";

export default async function Home() {
  // 🔑 Use logical day (rollover at 2:30 PM IST)
  const today = getLogicalDate();

  // 1. Try KV first
  let todays = await getPersistedDailyQuote(today);

  // 2. If missing (first deploy / new region), generate safely
  if (!todays) {
    todays = await ensurePersistedDailyQuote(getTodaysQuote);
  }

  const theme = getThemeByAuthor(todays.person.id, todays.mood);

  return (
    <div className="relative min-h-screen font-sans">
      <Background3D theme={theme} className="fixed inset-0 -z-10" />

      <main className="min-h-screen w-full px-6 py-12 flex items-center justify-center">
        <div className="will-change-[opacity,transform] quote-fade-in">
          <QuoteCard
            quote={todays.quote}
            authorName={todays.person.name}
            theme={theme}
          />
        </div>
      </main>

      <style>{`
        @keyframes quoteFadeIn {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .quote-fade-in {
          opacity: 0;
          animation: quoteFadeIn 650ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .quote-fade-in {
            opacity: 1;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- helpers ---------- */

/**
 * Logical day for production:
 * - New quote rolls over at 2:30 PM IST
 * - Implemented by shifting time BACK by 14.5 hours
 */
function getLogicalDate(now: Date = new Date()): string {
  const SHIFT_MS = 14.5 * 60 * 60 * 1000; // 14h 30m
  const shifted = new Date(now.getTime() - SHIFT_MS);

  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
