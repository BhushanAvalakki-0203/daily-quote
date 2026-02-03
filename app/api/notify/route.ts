import { NextResponse } from "next/server";

/**
 * Route Handler: POST /api/notify
 *
 * Purpose (for now):
 * - Validate a notification payload
 * - Log it (and nothing else)
 *
 * Future (intentionally NOT implemented here):
 * - WhatsApp delivery (e.g., via a provider like Twilio)
 * - Email delivery (e.g., via SMTP or an email API)
 *
 * Runtime intent:
 * - Today this is Edge-safe because it only validates input + logs.
 * - When you add real integrations (Twilio/SMTP/SDKs), you will likely need to switch to
 *   `export const runtime = "nodejs"` because many provider SDKs depend on Node APIs.
 *
 * Keeping this server-only prevents leaking tokens/credentials when you later add integrations.
 */
export const runtime = "edge";

export type NotifyPayload = Readonly<{
  quote: string;
  author: string;
  date: string; // expected "YYYY-MM-DD" (UTC)
  url: string; // canonical URL to the quote page
}>;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = parseNotifyPayload(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: "Invalid payload.",
          details: parsed.errors,
        },
        { status: 400 },
      );
    }

    // Log only. No external calls.
    // In production, this will show in your platform logs/observability.
    console.log("[/api/notify] payload", parsed.value);

    // Placeholder for future integrations:
    // - WhatsApp: sendWhatsApp(parsed.value)
    // - Email: sendEmail(parsed.value)
    // Keep these in server-only modules and inject secrets via environment variables.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/notify] unexpected error", err);
    return NextResponse.json(
      { error: "Unable to process notification." },
      { status: 500 },
    );
  }
}

type ParseOk<T> = { ok: true; value: T };
type ParseErr = { ok: false; errors: ReadonlyArray<string> };

function parseNotifyPayload(input: unknown): ParseOk<NotifyPayload> | ParseErr {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["Body must be a JSON object."] };
  }

  const quote = readNonEmptyString(input, "quote", errors, { maxLen: 300 });
  const author = readNonEmptyString(input, "author", errors, { maxLen: 80 });
  const date = readNonEmptyString(input, "date", errors, { maxLen: 10 });
  const url = readNonEmptyString(input, "url", errors, { maxLen: 2048 });

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('Field "date" must be in "YYYY-MM-DD" format (UTC).');
  }

  if (url) {
    try {
      // Basic URL validation. Accepts http(s) and other valid URLs, but we can
      // restrict later if needed (e.g., enforce https + same-origin).
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      errors.push('Field "url" must be a valid URL.');
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  // Sanitize: trim strings to keep logs tidy.
  return {
    ok: true,
    value: {
      quote: quote!.trim(),
      author: author!.trim(),
      date: date!.trim(),
      url: url!.trim(),
    },
  };
}

function readNonEmptyString(
  obj: Record<string, unknown>,
  key: string,
  errors: string[],
  opts?: { maxLen?: number },
): string | null {
  const v = obj[key];
  if (typeof v !== "string") {
    errors.push(`Field "${key}" must be a string.`);
    return null;
  }
  const t = v.trim();
  if (t.length === 0) {
    errors.push(`Field "${key}" cannot be empty.`);
    return null;
  }
  if (opts?.maxLen != null && t.length > opts.maxLen) {
    errors.push(`Field "${key}" must be at most ${opts.maxLen} characters.`);
    return null;
  }
  return t;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

