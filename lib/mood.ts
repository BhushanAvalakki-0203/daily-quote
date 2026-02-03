import "server-only";

/**
 * Simple, deterministic mood inference for a quote.
 *
 * This is intentionally:
 * - Fast (string checks only)
 * - Deterministic (no external services or AI calls)
 *
 * Limitations:
 * - This is a rough heuristic and not a true understanding of sentiment.
 * - Future improvement: store an explicit mood per quote when you curate them,
 *   or use an offline model in a controlled environment.
 */

export type Mood =
  | "inspiring"
  | "motivational"
  | "reflective"
  | "resilient"
  | "success"
  | "unknown";

/**
 * Runtime type guard for Mood.
 * IMPORTANT:
 * - KV / JSON deserialization turns everything into plain strings
 * - This lets us safely narrow `string | unknown` → `Mood`
 */
export function isMood(value: unknown): value is Mood {
  return (
    value === "inspiring" ||
    value === "motivational" ||
    value === "reflective" ||
    value === "resilient" ||
    value === "success" ||
    value === "unknown"
  );
}

/**
 * Infer mood from quote text.
 * Deterministic + fast heuristic.
 */
export function inferMood(quote: string): Mood {
  const text = quote.toLowerCase();

  if (/(dream|vision|imagine|future|possibility)/.test(text)) {
    return "inspiring";
  }

  if (/(work hard|hard work|practice|train|discipline|effort|grind)/.test(text)) {
    return "motivational";
  }

  if (/(failure|fail|defeat|struggle|pain|setback)/.test(text)) {
    return "resilient";
  }

  if (/(success|victory|win|triumph|achieve|achievement)/.test(text)) {
    return "success";
  }

  if (/(life|self|soul|mind|truth|inner)/.test(text)) {
    return "reflective";
  }

  return "unknown";
}
