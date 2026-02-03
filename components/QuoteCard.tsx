import type { Theme } from "../lib/themes";

export type QuoteCardProps = Readonly<{
  quote: string;
  authorName: string;
  theme: Theme;
  /**
   * Optional: render a smaller card variant on dense layouts.
   * Defaults to "normal".
   */
  size?: "normal" | "compact";
}>;

/**
 * A centered, responsive, accessible quote card.
 *
 * Semantic structure:
 * - `figure` groups quote + attribution
 * - `blockquote` contains the quote text
 * - `figcaption` contains the author name
 *
 * No buttons, no extra text (per requirements).
 */
export function QuoteCard({ quote, authorName, theme, size = "normal" }: QuoteCardProps) {
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.secondary,
  };

  const quoteStyle: React.CSSProperties = {
    color: theme.colors.text,
  };

  const authorStyle: React.CSSProperties = {
    color: theme.colors.mutedText,
  };

  return (
    <figure
      className={[
        "w-full max-w-3xl rounded-2xl border shadow-sm",
        "p-8 sm:p-10",
        "backdrop-blur",
        size === "compact" ? "max-w-2xl p-6 sm:p-8" : "",
      ].join(" ")}
      style={surfaceStyle}
    >
      <blockquote className="text-center">
        <p
          className={[
            "font-medium leading-snug tracking-tight",
            size === "compact" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl md:text-5xl",
          ].join(" ")}
          style={quoteStyle}
        >
          {quote}
        </p>
      </blockquote>
      <figcaption
        className={[
          "mt-6 text-center",
          size === "compact" ? "text-base" : "text-lg",
          "font-normal",
        ].join(" ")}
        style={authorStyle}
      >
        {authorName}
      </figcaption>
    </figure>
  );
}

