## Daily Quote

A calm, minimal daily-quote experience.

Each day, the app selects **one quote** from a curated set of quotes by famous personalities and renders it with a matching visual theme.

## How daily quote selection works

Daily selection is **deterministic per UTC date**, so everyone sees the same quote on a given day:

- The server computes today’s UTC date as `YYYY-MM-DD`.
- That date is hashed into a numeric seed.
- A small pseudo-random generator uses the seed to pick one quote from the full quote list.

This approach is simple and repeatable, and it makes the API cache-friendly.

**Limitation (no persistence):** the app does not store history, so it cannot guarantee “no repeats” across consecutive days. With \(N\) total quotes, repetition probability is roughly \(1/N\).

Implementation: `lib/selectQuote.ts`

## Folder structure

- `app/`
  - `page.tsx`: server-rendered homepage that chooses today’s quote and theme
  - `api/daily/route.ts`: `GET /api/daily` returns today’s quote as JSON (cacheable)
  - `api/notify/route.ts`: `POST /api/notify` validates and logs payloads (no integrations yet)
- `components/`
  - `QuoteCard.tsx`: accessible quote card (`figure` / `blockquote` / `figcaption`)
  - `Background3D.tsx`: lightweight parallax/3D illusion background (no Three.js)
- `lib/`
  - `quotes.ts`: quotes grouped by person (easy to edit)
  - `selectQuote.ts`: deterministic daily selection logic
  - `themes.ts`: author id → theme mapping and `getThemeByAuthor()`
- `cron.yaml`: Vercel cron schedule configuration

## Run locally

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## API

### `GET /api/daily`

Returns:

```json
{
  "date": "YYYY-MM-DD",
  "authorId": "steve-jobs",
  "authorName": "Steve Jobs",
  "quote": "Stay hungry, stay foolish."
}
```

Caching is set so responses can be cached **until the next UTC midnight**.

### `POST /api/notify`

Accepts a JSON payload:

```json
{
  "quote": "…",
  "author": "…",
  "date": "YYYY-MM-DD",
  "url": "https://…"
}
```

The handler validates inputs and **logs the payload only**. It is intentionally prepared for WhatsApp/email later, but **does not** implement Twilio/SMTP yet.

## Cron (Vercel)

`cron.yaml` schedules a daily request to `GET /api/daily` at:

- **08:00 IST**, which is **02:30 UTC** (IST is UTC+05:30)
- Cron expression: `30 2 * * *` (UTC)

This is useful for “warming” caches or triggering downstream workflows later.

## Extending quotes and themes

### Add quotes

Edit `lib/quotes.ts`:

- Add a new person entry in `QUOTES_BY_PERSON`.
- Keep quotes to **20 words max**.
- If you add a new person id, also extend the `QuotePersonId` union.

### Add themes

Edit `lib/themes.ts`:

- Add a new entry to `THEMES_BY_AUTHOR` keyed by the person id (`QuotePersonId`).
- Themes include: `colors`, `background`, and `motion` intensity.
- If an author is unknown, `getThemeByAuthor()` returns a sensible `DEFAULT_THEME`.
