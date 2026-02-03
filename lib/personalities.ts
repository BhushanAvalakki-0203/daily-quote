/**
 * Famous personalities list (names only).
 *
 * How to add more:
 * - Add the display name to `PERSONALITIES` (exact spelling helps API matching).
 * - Optionally add a custom theme for the generated author id in `lib/themes.ts`.
 *
 * Note: public quote APIs vary in how they match author names. If a name yields
 * no results, you may need to adjust spelling (e.g., "Swami Vivekananda" vs "Vivekananda").
 */
export const PERSONALITIES = [
  "Steve Jobs",
  "Cristiano Ronaldo",
  "Michael Phelps",
  "Swami Vivekananda",
] as const;

export type Personality = (typeof PERSONALITIES)[number];

/**
 * Stable author id derived from a name (used for theming and API responses).
 * Example: "Steve Jobs" -> "steve-jobs"
 */
export function toAuthorId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['".,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

