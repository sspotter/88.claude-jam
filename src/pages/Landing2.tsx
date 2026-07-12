import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { setUserLanguage } from "../i18n";
import { Link } from "react-router-dom";
import { getCategories } from "../lib/api/catalog";
import { handleApiError, OperationType } from "../lib/api/errors";

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  createdAt: number;
  isHidden?: boolean;
}

const badgeMapping: Record<string, React.ReactNode> = {
  "dates": <><ellipse cx="18" cy="26" rx="9" ry="12" stroke="#f2ca50" strokeWidth="1.4"/><ellipse cx="30" cy="26" rx="9" ry="12" stroke="#f2ca50" strokeWidth="1.4"/><path d="M18 14 Q24 8 30 14" stroke="#f2ca50" strokeWidth="1.4" fill="none"/></>,
  "gift boxes": <><path d="M16 12 H32 V16 H16 Z" stroke="#f2ca50" strokeWidth="1.4"/><path d="M18 16 V38 Q18 40 20 40 H28 Q30 40 30 38 V16" stroke="#f2ca50" strokeWidth="1.4" fill="none"/></>,
  "sweets": <><circle cx="24" cy="26" r="10" stroke="#f2ca50" strokeWidth="1.4"/><path d="M24 16 C26 12 29 14 29 16" stroke="#f2ca50" strokeWidth="1.4" fill="none"/></>,
  "premium": <><path d="M24 10 Q14 20 14 30 Q14 38 24 38 Q34 38 34 30 Q34 20 24 10 Z" stroke="#f2ca50" strokeWidth="1.4" fill="none"/></>,
};

const subMapping: Record<string, string> = {
  "dates": "Premium Selected Dates",
  "gift boxes": "Curated Collections",
  "sweets": "Artisanal Treats",
  "premium": "Exclusive Selection",
};

const imageMapping: Record<string, string> = {
  "dates": "/assets/animations/frames/ezgif-frame-010.jpg",
  "gift boxes": "/assets/animations/frames/ezgif-frame-030.jpg",
  "sweets": "/assets/animations/frames/ezgif-frame-050.jpg",
  "premium": "/assets/animations/frames/ezgif-frame-070.jpg",
};

const fallbackBadge = (
  <path d="M24 14 L26 22 L34 24 L26 26 L24 34 L22 26 L14 24 L22 22 Z" stroke="#f2ca50" strokeWidth="1.4" fill="none"/>
);

export default function Landing2() {
  const { t, i18n } = useTranslation();
  const videoRef        = useRef<HTMLVideoElement>(null);
  const headerRef       = useRef<HTMLElement>(null);
  const catStageRef     = useRef<HTMLElement>(null);
  const heroRef         = useRef<HTMLElement>(null);
  const heroContentRef  = useRef<HTMLDivElement>(null);
  const heroVignetteRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const fetched = (await getCategories()).filter((cat) => !cat.isHidden);
        setCategories(fetched);
      } catch (error) {
        handleApiError(error, OperationType.GET, "categories");
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    // Load Maj + Maj from Google Fonts
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Maj:wght@400;500;700&display=swap";
    document.head.appendChild(link);

    const video       = videoRef.current;
    const nav         = headerRef.current;
    const catStage    = catStageRef.current;
    const hero        = heroRef.current;
    const heroContent = heroContentRef.current;
    const heroVignette= heroVignetteRef.current;

    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.play().catch(() => {});
    }

    let catStageTop = 0;
    let catScrollH  = 0;
    let lastY       = window.scrollY;
    let ticking     = false;

    function updateCatDims() {
      if (!catStage) return;
      const r = catStage.getBoundingClientRect();
      catStageTop = r.top + window.scrollY;
      catScrollH  = catStage.offsetHeight - window.innerHeight;
    }

    function tick() {
      if (nav) nav.classList.toggle("an-scrolled", lastY > 50);

      // ── Hero scroll transition ──────────────────────────────────────
      // As the hero (100vh) scrolls away: copy fades + drifts up, the dark
      // overlay dissolves, and the video brightens to full — so the content
      // melts into the video rather than abruptly vanishing.
      if (hero) {
        const heroH = hero.offsetHeight || window.innerHeight;
        const hp = Math.max(0, Math.min(1, lastY / heroH)); // 0 → 1 over hero

        if (heroContent) {
          if (window.innerWidth <= 640) {
            // Mobile: copy sits below the video in normal flow — keep it fully
            // visible; skip the desktop fade/drift so it doesn't vanish on scroll.
            heroContent.style.opacity = "";
            heroContent.style.transform = "";
            heroContent.style.pointerEvents = "";
          } else {
            // finish the copy fade by ~75% of the scroll for a clean handoff
            const cp = Math.min(1, hp / 0.75);
            const ease = cp * (2 - cp); // easeOutQuad
            heroContent.style.opacity = String(1 - ease);
            heroContent.style.transform = `translateY(${-ease * 80}px)`;
            heroContent.style.pointerEvents = ease >= 1 ? "none" : "auto";
          }
        }
        // video: brightness 0.45 (dimmed) → 1 (full)
        if (video) video.style.filter = `brightness(${0.45 + 0.55 * hp}) contrast(1.1)`;
        // dark overlay/vignette: fully visible → gone
        if (heroVignette) heroVignette.style.opacity = String(1 - hp);
      }

      if (catStage && catScrollH > 0) {
        let cp = (lastY - catStageTop) / catScrollH;
        cp = Math.max(0, Math.min(1, cp));
        document.querySelectorAll(".an-cat-card").forEach((card, i) => {
          card.classList.toggle("is-revealed", cp >= 0.05 + i * 0.25);
        });
      }
    }

    function onScroll() {
      lastY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => { tick(); ticking = false; });
        ticking = true;
      }
    }

    function onResize() { updateCatDims(); tick(); }

    const timer = setTimeout(() => { updateCatDims(); tick(); }, 100);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.head.removeChild(link);
    };
  }, [categories]);

  return (
    <>
      <style>{`
        /* ─── ARTISANAL NOIR DESIGN SYSTEM ─────────────────────────────── */
        .an-root {
          --an-bg:           #131313;
          --an-surface:      #1a1a1a;
          --an-surface-high: #2a2a2a;
          --an-surface-top:  #353534;
          --an-text:         #e5e2e1;
          --an-text-muted:   #a0a0a0;
          --an-text-variant: #d0c5af;
          --an-gold:         #f2ca50;
          --an-gold-dim:     #e9c349;
          --an-gold-deep:    #d4af37;
          --an-outline:      rgba(212,175,55,0.20);
          --an-outline-var:  #4d4635;
          --an-shadow:       0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.12);
          --an-nav-h:        64px;
          --an-radius:       0.25rem;
          --an-radius-lg:    0.5rem;
          --an-radius-full:  9999px;
          font-family: "Maj", sans-serif;
          background: var(--an-bg);
          color: var(--an-text);
        }

        /* ── NAV ──────────────────────────────────────────────────────── */
        .an-nav {
          position: fixed; top: 0; left: 0; right: 0;
          height: var(--an-nav-h); z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(1.5rem, 5vw, 5rem);
          transition: background 300ms ease, box-shadow 300ms ease;
        }
        .an-nav.an-scrolled {
          background: rgba(19,19,19,0.92);
          backdrop-filter: blur(32px);
          box-shadow: 0 1px 0 var(--an-outline);
        }
        .an-nav-brand {
          display: flex; align-items: center;
          text-decoration: none; white-space: nowrap;
        }
        .an-nav-brand-logo {
          height: 52px; width: auto;
          object-fit: contain; flex-shrink: 0;
        }
        .an-nav-cta {
          padding: 0.5rem 1.5rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-gold);
          background: transparent;
          color: var(--an-gold);
          font-family: "Maj", sans-serif;
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none;
          transition: all 200ms ease;
        }
        .an-nav-cta:hover {
          background: var(--an-gold);
          color: #131313;
          box-shadow: 0 0 16px rgba(242,202,80,0.35);
        }
        .an-lang-toggle {
          padding: 0.4rem 1rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent;
          color: var(--an-text-muted);
          font-family: "Maj", sans-serif;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer;
          transition: all 200ms ease;
        }
        .an-lang-toggle:hover {
          border-color: var(--an-gold);
          color: var(--an-gold);
        }

        /* ── HERO ─────────────────────────────────────────────────────── */
        .an-hero {
          position: relative; height: 100vh;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; background: #0e0e0e;
        }
        .an-hero-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          filter: brightness(0.45) contrast(1.1);
        }
        .an-hero-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(13,13,13,0.85) 100%);
        }
        .an-hero-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 0 clamp(1.5rem, 5vw, 5rem);
          padding-top: var(--an-nav-h);
          will-change: opacity, transform;
        }
        .an-hero-video { will-change: filter; }
        .an-hero-vignette { will-change: opacity; }
        .an-label-caps {
          font-family: "Maj", sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-gold-dim); margin-bottom: 1.5rem;
        }
        .an-hero-title {
          margin: 0;
          font-family: "Maj", serif;
          font-size: clamp(3.5rem, 8vw, 6rem);
          font-weight: 700; line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--an-text);
        }
        .an-hero-title em {
          font-style: italic;
          color: var(--an-gold);
        }
        .an-hero-sub {
          margin: 1.5rem 0 2.5rem;
          font-size: 1rem; line-height: 1.6;
          color: var(--an-text-muted);
          max-width: 480px;
        }
        .an-btn-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2.2rem;
          border-radius: var(--an-radius-full);
          background: var(--an-gold);
          color: #131313;
          font-family: "Maj", sans-serif;
          font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none;
          transition: all 250ms ease;
          box-shadow: 0 8px 24px rgba(242,202,80,0.25);
        }
        .an-btn-primary:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 12px 32px rgba(242,202,80,0.40);
          transform: translateY(-2px);
        }
        .an-btn-ghost {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2.2rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-gold);
          background: transparent;
          color: var(--an-gold);
          font-family: "Maj", sans-serif;
          font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none;
          transition: all 250ms ease;
        }
        .an-btn-ghost:hover {
          background: rgba(242,202,80,0.08);
          box-shadow: 0 0 16px rgba(242,202,80,0.20);
        }
        .an-scroll-hint {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          margin-top: 3rem; color: rgba(229,226,225,0.4);
        }
        .an-scroll-hint span {
          font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase;
        }
        .an-scroll-line {
          width: 1px; height: 44px;
          background: linear-gradient(180deg, rgba(242,202,80,0.6), transparent);
          position: relative; overflow: hidden;
        }
        .an-scroll-line::after {
          content: ''; position: absolute; top: 0; left: 0;
          width: 100%; height: 50%; background: var(--an-gold);
          animation: anScrollDown 1.8s infinite ease-in-out;
        }
        @keyframes anScrollDown {
          0%       { transform: translateY(-100%); }
          80%,100% { transform: translateY(220%);  }
        }

        /* MOBILE HERO — video on top (below the navbar), copy stacked underneath */
        @media (max-width: 640px) {
          .an-hero {
            display: block;
            height: auto;
            overflow: visible;
          }
          /* Video + vignette: a fixed-height block pinned just below the navbar.
             bottom:auto cancels inset:0 so the explicit height controls the box. */
          .an-hero-video,
          .an-hero-vignette {
            top: calc(var(--an-nav-h) + 16px);
            height: 45vh;
            bottom: auto;
          }
          /* Hero copy flows in normal order, underneath the video block.
             padding-top (not margin) avoids margin-collapse and clears the video. */
          .an-hero-content {
            padding-top: calc(var(--an-nav-h) + 16px + 45vh + 2rem);
            padding-bottom: 3rem;
          }
        }

        /* ── DIVIDER ──────────────────────────────────────────────────── */
        .an-divider {
          width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-deep), transparent);
          opacity: 0.35;
        }

        /* ── SIGNATURE SECTION ────────────────────────────────────────── */
        .an-signature {
          background: linear-gradient(180deg, #131313 0%, #1a1a1a 100%);
          padding: 8rem 0;
          border-top: 1px solid var(--an-outline);
        }
        .an-container {
          max-width: 1280px; margin: 0 auto;
          padding: 0 clamp(1.5rem, 5vw, 5rem);
        }
        .an-grid-2 {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 5rem; align-items: center;
        }
        @media(max-width:900px) {
          .an-grid-2 { grid-template-columns: 1fr; gap: 3rem; }
          .an-signature { padding: 5rem 0; }
        }
        .an-content-block { display: flex; flex-direction: column; gap: 1.5rem; }
        .an-section-kicker {
          font-family: "Maj", sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-gold);
        }
        .an-headline-lg {
          margin: 0;
          font-family: "Maj", serif;
          font-size: clamp(2rem, 4vw, 2.5rem);
          font-weight: 600; line-height: 1.2;
          color: var(--an-text);
        }
        .an-body-lg {
          margin: 0; font-size: 1.05rem; line-height: 1.75;
          color: var(--an-text-muted);
        }
        .an-features { display: flex; flex-direction: column; gap: 2rem; margin-top: 1rem; }
        .an-feature-item { display: flex; gap: 1.5rem; align-items: flex-start; }
        .an-feature-num {
          font-family: "Maj", serif;
          font-size: 2rem; font-weight: 400;
          color: var(--an-gold); line-height: 1; flex-shrink: 0;
        }
        .an-feature-title {
          margin: 0 0 0.4rem;
          font-family: "Maj", sans-serif;
          font-size: 0.85rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--an-text);
        }
        .an-feature-desc { margin: 0; font-size: 0.9rem; line-height: 1.6; color: var(--an-text-muted); }

        /* Luxury card */
        .an-card-luxury {
          position: relative; width: 100%; max-width: 300px; aspect-ratio: 3/4;
          background: linear-gradient(160deg, #1a1a1a 0%, #0e0e0e 100%);
          border-radius: var(--an-radius-lg);
          border: 1px solid var(--an-outline);
          box-shadow: var(--an-shadow);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.5s cubic-bezier(0.25,1,0.5,1), box-shadow 0.5s ease;
          margin: 0 auto;
        }
        .an-card-luxury:hover {
          transform: translateY(-8px);
          box-shadow: 0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(242,202,80,0.25);
        }
        .an-card-frame {
          position: absolute; inset: 1rem;
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius);
          pointer-events: none;
        }
        .an-card-inner {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 0.75rem; text-align: center; padding: 2rem;
        }
        .an-card-badge-icon { filter: drop-shadow(0 2px 8px rgba(242,202,80,0.30)); }
        .an-card-title {
          margin: 0;
          font-family: "Maj", serif;
          font-size: 1.5rem; font-weight: 600;
          letter-spacing: 0.18em; color: var(--an-gold);
        }
        .an-card-rule {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .an-card-sub {
          margin: 0; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--an-text-variant);
        }
        .an-card-year { margin-top: 0.5rem; font-size: 0.65rem; letter-spacing: 0.15em; color: var(--an-text-muted); }

        /* Chips */
        .an-chip {
          display: inline-flex; align-items: center;
          padding: 0.3rem 0.9rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-gold);
          color: var(--an-gold);
          font-family: "Maj", sans-serif;
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          background: transparent;
        }
        .an-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }

        /* ── CATEGORIES ───────────────────────────────────────────────── */
        .an-categories-section {
          position: relative; height: 220vh;
          background: #131313;
          border-top: 1px solid var(--an-outline);
          z-index: 2;
        }
        .an-categories-sticky {
          position: sticky; top: 0; height: 100vh;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          overflow: hidden; width: 100%;
        }
        .an-cat-container {
          width: 100%; display: flex; flex-direction: column;
          align-items: center; gap: 3rem;
          position: relative;
          background-image: url('/category_background.jpeg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-radius: 24px;
          padding: 3rem 2rem;
        }
        .an-cat-container::before {
          content: '';
          position: absolute; inset: 0;
          background: rgba(0, 0, 0, 0.55);
          border-radius: 24px;
          pointer-events: none;
          z-index: 0;
        }
        .an-cat-container > * { position: relative; z-index: 1; }
        .an-categories-header { text-align: center; display: flex; flex-direction: column; gap: 0.75rem; }
        .an-categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 270px));
          justify-content: center; gap: 2rem; width: 100%;
          max-width: calc(4 * 270px + 3 * 2rem);
        }
        .an-categories-grid--count-1 { grid-template-columns: minmax(260px, 320px); }
        .an-categories-grid--count-2 { grid-template-columns: repeat(2, minmax(260px, 310px)); gap: 5rem; }
        .an-categories-grid--count-3 { grid-template-columns: repeat(3, minmax(230px, 270px)); gap: 3rem; }
        @media(max-width:900px) {
          .an-categories-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 250px)); gap: 1.5rem; }
          .an-categories-grid--count-2 { grid-template-columns: repeat(2, minmax(200px, 260px)); gap: 2.5rem; }
        }
        @media(max-width:500px) {
          .an-categories-grid,
          .an-categories-grid--count-2 { grid-template-columns: 1fr; gap: 1.5rem; }
        }

        /* Category card — dark Obsidian base */
        .an-cat-card {
          position: relative;
          background: linear-gradient(160deg, #1c1b1b 0%, #0e0e0e 100%);
          border: 1px solid var(--an-outline);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: visible; padding-top: 1.6rem;
          opacity: 0; transform: translateY(60px);
          transition: opacity 650ms cubic-bezier(0.22,1,0.36,1),
                      transform 650ms cubic-bezier(0.22,1,0.36,1),
                      box-shadow 350ms ease;
          will-change: transform, opacity;
          display: flex; flex-direction: column;
        }
        .an-cat-card.is-revealed { opacity: 1; transform: translateY(0); }
        .an-cat-card.is-revealed:hover {
          transform: translateY(-8px);
          box-shadow: 0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(242,202,80,0.25),
                      inset 0 1px 0 rgba(255,255,255,0.04);
        }
        /* Gold top-border accent */
        .an-cat-card::before {
          content: '';
          position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
          border-radius: 1px;
        }
        .an-cat-card__badge {
          position: absolute; top: -1rem; left: 50%;
          transform: translateX(-50%); z-index: 2;
          width: 2.6rem; height: 2.6rem; border-radius: 50%;
          background: #1a1a1a; border: 1px solid var(--an-outline);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(242,202,80,0.12);
          display: grid; place-items: center;
        }
        .an-cat-card__badge svg { width: 1.3rem; height: 1.3rem; }
        .an-cat-card__img-wrap {
          width: 100%; aspect-ratio: 1.1;
          border-radius: 18px 18px 0 0;
          overflow: hidden;
          background: #201f1f;
        }
        .an-cat-card__img-wrap img {
          width: 100%; height: 100%; object-fit: cover;
          display: block; transition: transform 500ms ease;
          filter: brightness(0.9);
        }
        .an-cat-card:hover .an-cat-card__img-wrap img { transform: scale(1.04); filter: brightness(1); }
        .an-cat-card__body {
          padding: 1.2rem 1.4rem 1.6rem;
          display: flex; flex-direction: column;
          align-items: center; gap: 0.5rem;
          text-align: center; flex-grow: 1;
        }
        .an-cat-card__name {
          margin: 0;
          font-family: "Maj", serif;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          font-weight: 500; letter-spacing: 0.18em;
          color: var(--an-text);
        }
        .an-cat-card__rule {
          width: 1.5rem; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .an-cat-card__sub {
          margin: 0 0 0.5rem;
          font-size: 0.82rem; color: var(--an-text-muted); line-height: 1.4;
        }
        .an-cat-card__cta {
          display: inline-flex; align-items: center; gap: 0.4rem;
          margin-top: auto; padding: 0.5rem 1.2rem;
          border: 1px solid var(--an-gold);
          border-radius: var(--an-radius-full);
          background: transparent; color: var(--an-gold);
          text-decoration: none;
          font-family: "Maj", sans-serif;
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          transition: all 200ms ease;
        }
        .an-cat-card__cta svg { width: 0.85rem; height: 0.85rem; transition: transform 200ms ease; }
        .an-cat-card__cta:hover {
          background: var(--an-gold); color: #131313;
          box-shadow: 0 0 16px rgba(242,202,80,0.30);
        }
        .an-cat-card__cta:hover svg { transform: translateX(3px); }

        /* ── STORY / FOOTER SECTION ───────────────────────────────────── */
        .an-story-section {
          background: #1a1a1a;
          padding: 8rem 0 4rem;
          border-top: 1px solid var(--an-outline);
          position: relative; z-index: 10;
        }
        .an-story-grid {
          display: grid; grid-template-columns: 1.2fr 1fr;
          gap: 5rem; margin-bottom: 6rem;
        }
        @media(max-width:860px) { .an-story-grid { grid-template-columns: 1fr; gap: 3rem; } }
        .an-story-content { display: flex; flex-direction: column; gap: 1.2rem; }
        .an-story-title {
          margin: 0;
          font-family: "Maj", serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 600; line-height: 1.15;
          color: var(--an-text);
        }
        .an-story-text { margin: 0; font-size: 0.98rem; line-height: 1.7; color: var(--an-text-muted); }

        /* Newsletter card — dark surface with gold border */
        .an-newsletter-card {
          background: #201f1f;
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          padding: 2.5rem;
          display: flex; flex-direction: column; gap: 1rem;
          backdrop-filter: blur(32px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .an-newsletter-title {
          margin: 0;
          font-family: "Maj", serif;
          font-size: 1.6rem; font-weight: 500;
          color: var(--an-text);
        }
        .an-newsletter-text { margin: 0; font-size: 0.9rem; line-height: 1.6; color: var(--an-text-muted); }
        .an-newsletter-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
        .an-newsletter-form input {
          flex-grow: 1; padding: 0.8rem 1.2rem;
          border-radius: 0; /* bottom-only border style */
          border: none; border-bottom: 1px solid var(--an-outline);
          background: transparent;
          font-family: "Maj", sans-serif;
          font-size: 0.88rem; color: var(--an-text);
          outline: none;
          transition: border-color 200ms ease;
        }
        .an-newsletter-form input::placeholder { color: var(--an-text-muted); }
        .an-newsletter-form input:focus { border-color: var(--an-gold); }
        .an-newsletter-form button {
          padding: 0.8rem 1.8rem;
          border-radius: var(--an-radius-full);
          border: none; cursor: pointer;
          background: var(--an-gold); color: #131313;
          font-family: "Maj", sans-serif;
          font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 200ms ease;
        }
        .an-newsletter-form button:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 0 16px rgba(242,202,80,0.35);
        }

        /* ── SITE FOOTER ──────────────────────────────────────────────── */
        .an-site-footer {
          border-top: 1px solid var(--an-outline);
          padding-top: 3rem;
          display: flex; flex-direction: column;
          align-items: center; gap: 2rem;
        }
        .an-footer-brand {
          font-family: "Maj", serif;
          font-size: 2rem; font-weight: 700;
          letter-spacing: 0.3em; color: var(--an-gold);
        }
        .an-footer-links { display: flex; gap: 2.5rem; }
        .an-footer-links a {
          font-family: "Maj", sans-serif; font-size: 0.78rem;
          color: var(--an-text-muted); text-decoration: none;
          letter-spacing: 0.05em; transition: color 200ms ease;
        }
        .an-footer-links a:hover { color: var(--an-gold); }
        .an-footer-copy {
          font-family: "Maj", sans-serif; font-size: 0.72rem;
          color: #4d4635; letter-spacing: 0.04em;
        }
      `}</style>

      <div className="an-root">

        {/* ── Navigation ───────────────────────────────────────────── */}
        <header className="an-nav" ref={headerRef}>
          <a className="an-nav-brand" href="/landing2">
            <img
              src={i18n.language === "ar" ? "/nav-logo-ar.png" : "/nav-logo-eng.png"}
              className="an-nav-brand-logo"
              alt={t("jamhawi")}
            />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setUserLanguage(i18n.language === "ar" ? "en" : "ar")}
              className="an-lang-toggle"
              aria-label="Toggle language"
            >
              {i18n.language === "ar" ? "EN" : "عربي"}
            </button>
            <Link to="/shop/products" className="an-nav-cta">{t("shop_now")}</Link>
          </div>
        </header>

        <main>

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <section className="an-hero" ref={heroRef}>
            <video
              ref={videoRef}
              className="an-hero-video"
              src="/video3.mp4"
              muted autoPlay loop playsInline preload="auto"
            />
            <div className="an-hero-vignette" ref={heroVignetteRef} />

            <div className="an-hero-content" ref={heroContentRef}>
              <span className="an-label-caps">{t("the_art_of_details")}</span>
              <h1 className="an-hero-title">
                {t("immersive")}<br /><em>{t("purity")}</em>
              </h1>
              <p className="an-hero-sub">
                {t("hero_subtitle")}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Link to="/shop/products" className="an-btn-primary">
                  {t("shop_now")}
                  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <a href="#collection" className="an-btn-ghost">{t("discover_more")}</a>
              </div>
              <div className="an-scroll-hint" aria-hidden="true">
                <span>{t("scroll")}</span>
                <div className="an-scroll-line" />
              </div>
            </div>
          </section>

          {/* ── Signature Section ────────────────────────────────────── */}
          <section className="an-signature">
            <div className="an-container">
              <div className="an-grid-2">
                <div className="an-content-block">
                  <span className="an-section-kicker">{t("signature_harvest")}</span>
                  <h2 className="an-headline-lg">{t("a_symphony_of")}<br />{t("texture_and_taste")}</h2>
                  <p className="an-body-lg">
                    {t("signature_body")}
                  </p>
                  <div className="an-chips">
                    <span className="an-chip">{t("natural_100")}</span>
                    <span className="an-chip">{t("hand_selected")}</span>
                    <span className="an-chip">{t("est_1984_2")}</span>
                  </div>
                  <div className="an-features">
                    <div className="an-feature-item">
                      <span className="an-feature-num">01</span>
                      <div>
                        <h3 className="an-feature-title">{t("pure_origin")}</h3>
                        <p className="an-feature-desc">{t("cultivated_in_the_world_renowned_mineral")}</p>
                      </div>
                    </div>
                    <div className="an-feature-item">
                      <span className="an-feature-num">02</span>
                      <div>
                        <h3 className="an-feature-title">{t("hand_selected")}</h3>
                        <p className="an-feature-desc">{t("each_date_undergoes_rigorous_inspection_")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div className="an-card-luxury">
                    <div className="an-card-frame" />
                    <div className="an-card-inner">
                      <svg viewBox="0 0 48 48" fill="none" width="44" height="44" className="an-card-badge-icon">
                        <ellipse cx="18" cy="26" rx="9" ry="12" stroke="#f2ca50" strokeWidth="1.4"/>
                        <ellipse cx="30" cy="26" rx="9" ry="12" stroke="#f2ca50" strokeWidth="1.4"/>
                        <path d="M18 14 Q24 8 30 14" stroke="#f2ca50" strokeWidth="1.4" fill="none"/>
                      </svg>
                      <h4 className="an-card-title">{t("jamhawi_gold")}</h4>
                      <div className="an-card-rule" />
                      <p className="an-card-sub">{t("limited_edition_harvest_2")}</p>
                      <span className="an-card-year">{t("est_1984")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="an-container"><div className="an-divider" /></div>

          {/* ── Categories ───────────────────────────────────────────── */}
          <section id="collection" className="an-categories-section" ref={catStageRef}>
            <div className="an-categories-sticky">
              <div className="an-container an-cat-container">
                <div className="an-categories-header">
                  <span className="an-section-kicker">{t("our_collection")}</span>
                  <h2 className="an-headline-lg">{t("shop_by_category")}</h2>
                </div>

                <div className={`an-categories-grid ${loading ? "an-categories-grid--count-4" : `an-categories-grid--count-${categories.length}`}`}>
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <article key={i} className="an-cat-card is-revealed" style={{ opacity: 0.4 }}>
                          <div className="an-cat-card__img-wrap" style={{ height: "180px", background: "#2a2a2a" }} />
                          <div className="an-cat-card__body" style={{ gap: "0.75rem" }}>
                            <div style={{ height: "1rem", background: "#353534", borderRadius: "4px", width: "60%" }} />
                            <div style={{ height: "0.75rem", background: "#2a2a2a", borderRadius: "4px", width: "40%" }} />
                          </div>
                        </article>
                      ))
                    : categories.map((cat, i) => {
                        const nameKey = cat.name.toLowerCase();
                        const badge = badgeMapping[nameKey] || fallbackBadge;
                        const subKeyMap: Record<string, string> = {
                          "dates": "cat_sub_dates",
                          "gift boxes": "cat_sub_gift_boxes",
                          "sweets": "cat_sub_sweets",
                          "premium": "cat_sub_premium",
                        };
                        const sub = t(subKeyMap[nameKey] || "cat_sub_fallback");
                        const img = cat.image || imageMapping[nameKey] || "/assets/animations/frames/ezgif-frame-010.jpg";
                        const displayName = i18n.language === "ar" ? cat.nameAr || cat.name : cat.name;

                        return (
                          <article key={cat.id} className="an-cat-card" style={{ transitionDelay: `${i * 80}ms` }}>
                            <div className="an-cat-card__badge">
                              <svg viewBox="0 0 48 48" fill="none">{badge}</svg>
                            </div>
                            <div className="an-cat-card__img-wrap">
                              <img src={img} alt={displayName} />
                            </div>
                            <div className="an-cat-card__body">
                              <h3 className="an-cat-card__name">{displayName}</h3>
                              <div className="an-cat-card__rule" />
                              <p className="an-cat-card__sub">{sub}</p>
                              <Link to={`/category/${cat.id}`} className="an-cat-card__cta">
                                {t("explore")}
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                </div>
              </div>
            </div>
          </section>

          {/* ── Story & Footer ───────────────────────────────────────── */}
          <section className="an-story-section">
            <div className="an-container">
              <div className="an-story-grid">
                <div className="an-story-content">
                  <span className="an-section-kicker">{t("our_heritage")}</span>
                  <h2 className="an-story-title">{t("a_legacy_of_pure_taste")}</h2>
                  <p className="an-story-text">
                    {t("story_body")}
                  </p>
                  <Link to="/shop/products" className="an-btn-primary">
                    {t("browse_the_store")}
                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>

                <div className="an-newsletter-card">
                  <h3 className="an-newsletter-title">{t("subscribe_to_the_club")}</h3>
                  <p className="an-newsletter-text">
                    {t("receive_exclusive_access_to_seasonal_har")}
                  </p>
                  <form className="an-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                    <input type="email" placeholder={t("your_email_address")} aria-label={t("your_email_address")} required />
                    <button type="submit">{t("join")}</button>
                  </form>
                </div>
              </div>

              <footer className="an-site-footer">
                <div className="an-footer-brand">{t("jamhawi")}</div>
                <nav className="an-footer-links" aria-label="Footer navigation">
                  <a href="#">{t("privacy_policy")}</a>
                  <a href="#">{t("terms_of_service")}</a>
                  <Link to="/shop">{t("shop")}</Link>
                </nav>
                <div className="an-footer-copy">{t("footer_copyright", { year: new Date().getFullYear() })}</div>
              </footer>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
