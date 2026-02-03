"use client";

import * as React from "react";
import type { Theme } from "../lib/themes";

export type Background3DProps = Readonly<{
  theme: Theme;
  /**
   * Optional: extra classes for positioning (e.g., "fixed inset-0").
   * Defaults to a full-bleed absolute background layer.
   */
  className?: string;
}>;

/**
 * Lightweight "3D illusion" background.
 *
 * Why not Three.js?
 * - Three.js/WebGL can look amazing, but it increases bundle size, GPU usage,
 *   and can hurt mobile battery/perf for a simple quote app.
 * - This component uses layered gradients + subtle transforms to achieve a calm
 *   parallax/3D feel while staying fast and small.
 *
 * Tradeoffs:
 * - CSS parallax isn't true 3D; it's an illusion (layers moving at different rates).
 * - Pointer-based parallax only reacts on devices with a precise pointer.
 * - Without persistence or sensor use, motion is limited by design to stay calm.
 *
 * Accessibility:
 * - Respects `prefers-reduced-motion`: motion becomes effectively disabled.
 * - Motion intensity also respects `theme.motion`.
 */
export function Background3D({ theme, className }: Background3DProps) {
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 }); // normalized [-1, 1]

  // Respect prefers-reduced-motion.
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mql.matches));
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  // Pause animations when the document is not visible.
  // This keeps behavior identical while visible, but avoids unnecessary work in background tabs.
  React.useEffect(() => {
    const apply = () => setIsVisible(document.visibilityState === "visible");
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, []);

  const motionScale = React.useMemo(() => {
    if (reducedMotion) return 0;
    switch (theme.motion) {
      case "none":
        return 0;
      case "low":
        return 0.6;
      case "medium":
        return 1;
      default:
        return 0.6;
    }
  }, [reducedMotion, theme.motion]);

  // Pointer parallax on desktop; gentle and capped.
  React.useEffect(() => {
    if (motionScale === 0) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      // When hidden, skip work entirely (prevents idle CPU usage in background tabs).
      if (!isVisible) return;

      // Normalize pointer position to [-1..1] from center of viewport.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;

      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        setTilt({
          x: clamp(nx, -1, 1),
          y: clamp(ny, -1, 1),
        });
      });
    };

    // Pointer events are supported widely; on touch devices, they may fire less often.
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [isVisible, motionScale]);

  // If there's no meaningful pointer movement (common on mobile), add a very subtle drift.
  React.useEffect(() => {
    // No drift if motion is disabled, or if the tab isn't visible.
    // This avoids a continuous requestAnimationFrame loop in background tabs.
    if (motionScale === 0 || !isVisible) return;

    let raf = 0;
    // Keep phase continuity across visibility changes:
    // - When hidden, we stop animating (no visuals change because it's not visible).
    // - When visible again, we resume from the same elapsed time so motion looks consistent.
    const startRef = { t: performance.now() };
    const elapsedRef = { t: 0 };

    const tick = (t: number) => {
      const s = (elapsedRef.t + (t - startRef.t)) / 1000;
      // Very low-amplitude drift so it feels alive but calm.
      setTilt((prev) => {
        // Blend toward the drift target so we don't fight pointer movement.
        const targetX = Math.sin(s * 0.25) * 0.25;
        const targetY = Math.cos(s * 0.2) * 0.2;
        return {
          x: lerp(prev.x, targetX, 0.02),
          y: lerp(prev.y, targetY, 0.02),
        };
      });
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      // Record elapsed time so if the effect is restarted (e.g., visibility toggles),
      // the drift continues from the same phase.
      elapsedRef.t += performance.now() - startRef.t;
      window.cancelAnimationFrame(raf);
    };
  }, [isVisible, motionScale]);

  const baseBackground = backgroundToCss(theme);

  // Translate normalized tilt into small transforms. Keep motion calm, and let the
  // resolved theme control how deep the parallax feels.
  const parallax = theme.depth?.parallaxStrength ?? 1;
  const rotateX = (-tilt.y * 5 * motionScale * parallax).toFixed(3);
  const rotateY = (tilt.x * 6 * motionScale * parallax).toFixed(3);
  const layerShiftX = (tilt.x * 18 * motionScale * parallax).toFixed(2);
  const layerShiftY = (tilt.y * 14 * motionScale * parallax).toFixed(2);

  return (
    <div
      aria-hidden="true"
      className={[
        // Default: full-bleed background layer behind content.
        "pointer-events-none absolute inset-0 overflow-hidden",
        className ?? "",
      ].join(" ")}
      style={{ background: baseBackground }}
    >
      {/* Perspective wrapper */}
      <div
        className="absolute inset-0"
        style={{
          perspective: "900px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Layer 1: soft glow blobs */}
        <div
          className="absolute -inset-24 opacity-60 blur-3xl"
          style={{
            transform: `translate3d(${layerShiftX}px, ${layerShiftY}px, 0px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            background: buildGlowBackground(theme),
          }}
        />

        {/* Layer 2: subtle vignette for premium depth */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${-Number(layerShiftX) * 0.35}px, ${-Number(layerShiftY) * 0.35}px, 0px) rotateX(${Number(rotateX) * 0.35}deg) rotateY(${Number(rotateY) * 0.35}deg)`,
            background:
              "radial-gradient(120% 120% at 50% 35%, transparent 0%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0.28) 100%)",
            mixBlendMode: "soft-light",
            opacity: theme.motion === "none" ? 0.18 : 0.22,
          }}
        />

        {/* Optional: subtleNoise overlay when theme requests it */}
        {theme.background.kind === "subtleNoise" ? (
          <div
            className="absolute inset-0"
            style={{
              opacity: clamp(theme.background.opacity, 0, 0.12),
              backgroundImage:
                // Tiny inline noise-like pattern via repeating gradients (cheap, no assets).
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)," +
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 4px)",
              mixBlendMode: "overlay",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function backgroundToCss(theme: Theme): string {
  switch (theme.background.kind) {
    case "solid":
      return theme.background.color;
    case "gradient":
      return `linear-gradient(${theme.background.angleDeg ?? 135}deg, ${theme.background.from}, ${theme.background.to})`;
    case "subtleNoise":
      // Base color; noise overlay is rendered as a separate layer.
      return theme.background.base;
    default:
      return theme.colors.primary;
  }
}

/**
 * Build a soft, mood-aware glow field.
 *
 * Design intent:
 * - Use the same three-color glow concept, but let mood nudge where the brightest
 *   area appears (lightDirection) and how strong the glow is (depth.glowEmphasis).
 * - This keeps the effect cinematic and intentional without introducing flashy motion.
 */
function buildGlowBackground(theme: Theme): string {
  const glow = theme.depth?.glowEmphasis ?? 1;

  // Base positions correspond roughly to top-left, top-right, and bottom center.
  let p1 = { x: 20, y: 20 };
  let p2 = { x: 80, y: 30 };
  let p3 = { x: 50, y: 85 };

  switch (theme.lightDirection) {
    case "top-right":
      p1 = { x: 60, y: 18 };
      p2 = { x: 85, y: 28 };
      p3 = { x: 45, y: 80 };
      break;
    case "bottom-left":
      p1 = { x: 22, y: 40 };
      p2 = { x: 35, y: 75 };
      p3 = { x: 55, y: 88 };
      break;
    case "bottom-right":
      p1 = { x: 65, y: 45 };
      p2 = { x: 82, y: 78 };
      p3 = { x: 48, y: 90 };
      break;
    case "center":
      p1 = { x: 35, y: 30 };
      p2 = { x: 65, y: 30 };
      p3 = { x: 50, y: 75 };
      break;
    case "top-left":
    default:
      // keep defaults
      break;
  }

  const accentAlpha = 0.22 * glow;
  const secondaryAlpha = 0.18 * glow;
  const primaryAlpha = 0.22 * glow;

  return (
    `radial-gradient(60% 60% at ${p1.x}% ${p1.y}%, ${withAlpha(
      theme.colors.accent,
      accentAlpha,
    )} 0%, transparent 55%), ` +
    `radial-gradient(60% 60% at ${p2.x}% ${p2.y}%, ${withAlpha(
      theme.colors.secondary,
      secondaryAlpha,
    )} 0%, transparent 60%), ` +
    `radial-gradient(70% 70% at ${p3.x}% ${p3.y}%, ${withAlpha(
      theme.colors.primary,
      primaryAlpha,
    )} 0%, transparent 60%)`
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Converts a hex color to rgba() with alpha.
 * Accepts "#RRGGBB" or "#RGB". If parsing fails, returns the original color.
 */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h);
  if (!m) return hex;

  const raw = m[1];
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

