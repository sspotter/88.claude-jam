// Injects (and updates in place) a single <style> element that defines the
// @font-face for the uploaded custom font. The CSS family name is constant so
// the rest of the styling stays static (see [data-font="custom"] in index.css).

const STYLE_ID = "app-custom-font-face";
export const CUSTOM_FONT_FAMILY = "AppCustomFont";

function formatFromUrl(url: string): string | null {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".woff2")) return "woff2";
  if (clean.endsWith(".woff")) return "woff";
  if (clean.endsWith(".otf")) return "opentype";
  if (clean.endsWith(".ttf")) return "truetype";
  return null;
}

export function applyCustomFont(url: string): void {
  if (!url) return;
  const fmt = formatFromUrl(url);
  const src = fmt ? `url("${url}") format("${fmt}")` : `url("${url}")`;
  const css = `@font-face { font-family: "${CUSTOM_FONT_FAMILY}"; src: ${src}; font-display: swap; }`;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
