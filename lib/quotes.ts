/**
 * Structured quotes, grouped by person.
 *
 * How to add more:
 * - Add a new object inside `QUOTES_BY_PERSON`
 * - Use a unique `id` (kebab-case recommended)
 * - Add one or more quotes in `quotes`
 * - Keep each quote to **20 words max**
 * - Use only **famous personalities**
 *
 * Tip:
 * - Short, punchy quotes work best for daily reading
 * - No formatting inside quotes (plain strings only)
 */

export const QUOTES_BY_PERSON = [
  {
    id: "steve-jobs",
    name: "Steve Jobs",
    quotes: [
      "Stay hungry, stay foolish.",
      "Innovation distinguishes between a leader and a follower.",
      "Your time is limited, so don't waste it living someone else's life.",
    ],
  },
  {
    id: "cristiano-ronaldo",
    name: "Cristiano Ronaldo",
    quotes: [
      "Your love makes me strong, your hate makes me unstoppable.",
      "I'm living a dream I never want to wake up from.",
      "Talent without working hard is nothing.",
    ],
  },
  {
    id: "michael-phelps",
    name: "Michael Phelps",
    quotes: [
      "If you want to be the best, you have to do things others aren't willing to do.",
      "You can't put a limit on anything.",
      "If you dream it, you can do it.",
    ],
  },
  {
    id: "swami-vivekananda",
    name: "Swami Vivekananda",
    quotes: [
      "Arise, awake, and stop not till the goal is reached.",
      "You cannot believe in God until you believe in yourself.",
      "Strength is life, weakness is death.",
    ],
  },
] as const;

/**
 * Auto-derived types (NO manual maintenance needed)
 */
export type QuotePersonId = typeof QUOTES_BY_PERSON[number]["id"];

export type QuotePerson = {
  id: QuotePersonId;
  name: string;
  quotes: readonly string[];
};

/**
 * Read-only list of all quote groups.
 * Safe to use across UI, API, and logic layers.
 */
export const QUOTES: readonly QuotePerson[] = QUOTES_BY_PERSON;
