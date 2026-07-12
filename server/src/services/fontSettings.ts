export const ALLOWED_FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"] as const;

export interface CustomFont {
  name: string;
  url: string;
}

export interface FontSettingValue {
  selectedFont: string;
  custom: CustomFont | null;
}

/**
 * Validate an uploaded font by file extension. Font mimetypes are unreliable
 * (font/ttf, application/octet-stream, or empty depending on OS/browser), so we
 * key off the extension only.
 */
export function isAllowedFontExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_FONT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Build the next `font` setting value when only the selection changes, keeping
 * any previously uploaded custom font so it isn't wiped by picking Maj/Majalla.
 */
export function mergeFontSelection(existing: unknown, selectedFont: string): FontSettingValue {
  const prev = (existing ?? {}) as { custom?: CustomFont | null };
  return { selectedFont, custom: prev.custom ?? null };
}
