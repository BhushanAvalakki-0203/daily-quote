import type { Mood } from "./mood";

export type MotionIntensity = "none" | "low" | "medium";

export type BackgroundStyle =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; angleDeg?: number }
  | { kind: "subtleNoise"; base: string; opacity: number };

export type BaseTheme = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    mutedText: string;
    surface: string;
  };
  background: BackgroundStyle;
  motion: MotionIntensity;
};

export type LightDirection =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/**
 * FINAL THEME TYPE (Turbopack-safe)
 */
export type Theme = {
  colors: BaseTheme["colors"];
  background: BaseTheme["background"];
  motion: MotionIntensity;
  depth: {
    parallaxStrength: number;
    glowEmphasis: number;
  };
  lightDirection: LightDirection;
};

const THEMES_BY_AUTHOR: Record<string, BaseTheme> = {
  "steve-jobs": {
    colors: {
      primary: "#0B0F14",
      secondary: "#2B3440",
      accent: "#A3B18A",
      text: "#F4F6F8",
      mutedText: "#B7C0CC",
      surface: "#121821",
    },
    background: { kind: "gradient", from: "#0B0F14", to: "#121821", angleDeg: 135 },
    motion: "low",
  },
  "cristiano-ronaldo": {
    colors: {
      primary: "#0B1220",
      secondary: "#24314A",
      accent: "#D4AF37",
      text: "#F5F7FA",
      mutedText: "#BAC4D3",
      surface: "#111A2A",
    },
    background: { kind: "subtleNoise", base: "#0B1220", opacity: 0.05 },
    motion: "medium",
  },
  "michael-phelps": {
    colors: {
      primary: "#071B24",
      secondary: "#1D3B46",
      accent: "#4FB3D8",
      text: "#F2F7F8",
      mutedText: "#AFC2C8",
      surface: "#0D2630",
    },
    background: { kind: "gradient", from: "#071B24", to: "#0D2630", angleDeg: 160 },
    motion: "low",
  },
  "swami-vivekananda": {
    colors: {
      primary: "#14100B",
      secondary: "#3A2F22",
      accent: "#E07A2F",
      text: "#FAF6F0",
      mutedText: "#CBBFB2",
      surface: "#1C1711",
    },
    background: { kind: "solid", color: "#14100B" },
    motion: "none",
  },
};

const DEFAULT_BASE_THEME: BaseTheme = {
  colors: {
    primary: "#0B1220",
    secondary: "#26324A",
    accent: "#7AA2F7",
    text: "#F5F7FA",
    mutedText: "#B9C2D0",
    surface: "#101827",
  },
  background: { kind: "gradient", from: "#0B1220", to: "#101827", angleDeg: 140 },
  motion: "low",
};

export function getThemeByAuthor(authorId: string, mood: Mood = "unknown"): Theme {
  const base = THEMES_BY_AUTHOR[authorId] ?? DEFAULT_BASE_THEME;

  return {
    colors: base.colors,
    background: base.background,
    motion: resolveMotionForMood(base.motion, mood),
    depth: resolveDepthForMood(mood),
    lightDirection: resolveLightDirectionForMood(mood),
  };
}

function resolveMotionForMood(base: MotionIntensity, mood: Mood): MotionIntensity {
  if (mood === "reflective") return base === "medium" ? "low" : base;
  if (mood === "inspiring" || mood === "motivational" || mood === "success") {
    return base === "none" ? "low" : "medium";
  }
  if (mood === "resilient") return base === "none" ? "low" : base;
  return base;
}

function resolveDepthForMood(mood: Mood): Theme["depth"] {
  switch (mood) {
    case "inspiring":
      return { parallaxStrength: 1.05, glowEmphasis: 1.15 };
    case "motivational":
      return { parallaxStrength: 1.1, glowEmphasis: 1.05 };
    case "resilient":
      return { parallaxStrength: 0.95, glowEmphasis: 0.9 };
    case "success":
      return { parallaxStrength: 1.0, glowEmphasis: 1.2 };
    case "reflective":
      return { parallaxStrength: 0.85, glowEmphasis: 0.8 };
    default:
      return { parallaxStrength: 1.0, glowEmphasis: 1.0 };
  }
}

function resolveLightDirectionForMood(mood: Mood): LightDirection {
  switch (mood) {
    case "inspiring":
      return "top-right";
    case "motivational":
      return "top-left";
    case "resilient":
      return "bottom-left";
    case "success":
      return "top-right";
    case "reflective":
      return "center";
    default:
      return "top-left";
  }
}
