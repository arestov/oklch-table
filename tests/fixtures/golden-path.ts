/** Fixed user-facing data for the error-hover accessibility acceptance path. */
export const goldenPath = {
  accentBackground: "oklch(0.5 0.15 260)",
  accentHoverBackground: "oklch(0.6 0.15 260)",
  whiteText: "#ffffff",
  errorBackground: "oklch(0.5 0.2 25)",
  derivedLightness: "60",
  finalToken: "oklch(0.6 0.2 25)",
} as const;

export const goldenPathRows = [
  "accent-background",
  "accent-hover-background",
  "white text",
  "error-background",
  "derived error-hover-background",
] as const;
