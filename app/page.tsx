{/* Fixed background layer (client-only) */}
export const dynamic = "force-dynamic";

import { Background3D } from "../components/Background3D";
import { QuoteCard } from "../components/QuoteCard";
import { getThemeByAuthor } from "../lib/themes";
import { getPersistedDailyQuote } from "../lib/dailyStore";

export default async function Home() {
  // Server component: compute today's quote/theme on the server.
  const today = formatUtcDateYYYYMMDD(new Date());
  const todays = await getPersistedDailyQuote(today);
  if (!todays) {
    // We intentionally do NOT hit the quote API here:
    // - Daily selection is expected to be performed once by a cron job
    //   (see `cron.yaml` and `/api/daily`).
    // - Keeping the UI read-only with respect to quotes improves reliability
    //   during upstream outages.
    throw new Error(
      "Daily quote has not been generated yet. Ensure the daily cron (GET /api/daily) is running.",
    );
  }
  const theme = getThemeByAuthor(todays.person.id, todays.mood);

  return (
    <div className="relative min-h-screen font-sans">
      {/* Client component background behind all content */}
      <Background3D theme={theme} className="fixed inset-0 -z-10" />

      <main className="min-h-screen w-full px-6 py-12 flex items-center justify-center">
        {/* Fade-in uses opacity/transform only: no layout shift, no hydration work. */}
        <div className="will-change-[opacity,transform] quote-fade-in">
          <QuoteCard quote={todays.quote} authorName={todays.person.name} theme={theme} />
        </div>
      </main>

      {/* Local keyframes to avoid extra dependencies and keep this server-safe. */}
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
