export const dynamic = "force-dynamic";

import { Background3D } from "../components/Background3D";
import { QuoteCard } from "../components/QuoteCard";
import { getThemeByAuthor } from "../lib/themes";
import { getPersistedDailyQuote } from "../lib/dailyStore";
import { isMood, type Mood } from "../lib/mood";

export default async function Home() {
  const today = formatUtcDateYYYYMMDD(new Date());
  const todays = await getPersistedDailyQuote(today);

  if (!todays) {
    throw new Error(
      "Daily quote has not been generated yet. Ensure the daily cron (GET /api/daily) is running.",
    );
  }

  // ✅ SAFE runtime + type-safe narrowing
  const mood: Mood | undefined = isMood(todays.mood)
    ? todays.mood
    : undefined;

  const theme = getThemeByAuthor(todays.person.id, mood);

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

function formatUtcDateYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
