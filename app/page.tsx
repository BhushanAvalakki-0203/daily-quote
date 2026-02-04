export const dynamic = "force-dynamic";

import { Background3D } from "../components/Background3D";
import { QuoteCard } from "../components/QuoteCard";
import { getThemeByAuthor } from "../lib/themes";
import { getRotatingQuote } from "../lib/selectQuote";

export default async function Home() {
  const todays = await getRotatingQuote();
  const theme = getThemeByAuthor(todays.person.id, "unknown");

  return (
    <div className="relative min-h-screen">
      <Background3D theme={theme} className="fixed inset-0 -z-10" />
      <main className="flex min-h-screen items-center justify-center">
        <QuoteCard quote={todays.quote} authorName={todays.person.name} theme={theme} />
      </main>
    </div>
  );
}
