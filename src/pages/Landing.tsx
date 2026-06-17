import { useEffect, useRef, useState } from "react";
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
  "dates": <><ellipse cx="18" cy="26" rx="9" ry="12" stroke="#a87a33" strokeWidth="1.4"/><ellipse cx="30" cy="26" rx="9" ry="12" stroke="#a87a33" strokeWidth="1.4"/><path d="M18 14 Q24 8 30 14" stroke="#a87a33" strokeWidth="1.4" fill="none"/></>,
  "gift boxes": <><path d="M16 12 H32 V16 H16 Z" stroke="#a87a33" strokeWidth="1.4"/><path d="M18 16 V38 Q18 40 20 40 H28 Q30 40 30 38 V16" stroke="#a87a33" strokeWidth="1.4" fill="none"/></>,
  "sweets": <><circle cx="24" cy="26" r="10" stroke="#a87a33" strokeWidth="1.4"/><path d="M24 16 C26 12 29 14 29 16" stroke="#a87a33" strokeWidth="1.4" fill="none"/></>,
  "premium": <><path d="M24 10 Q14 20 14 30 Q14 38 24 38 Q34 38 34 30 Q34 20 24 10 Z" stroke="#a87a33" strokeWidth="1.4" fill="none"/></>
};

const subMapping: Record<string, string> = {
  "dates": "Premium Selected Dates",
  "gift boxes": "Curated Collections",
  "sweets": "Artisanal Treats",
  "premium": "Exclusive Selection"
};

const imageMapping: Record<string, string> = {
  "dates": "/assets/animations/frames/ezgif-frame-010.jpg",
  "gift boxes": "/assets/animations/frames/ezgif-frame-030.jpg",
  "sweets": "/assets/animations/frames/ezgif-frame-050.jpg",
  "premium": "/assets/animations/frames/ezgif-frame-070.jpg"
};

const fallbackBadge = <path d="M24 14 L26 22 L34 24 L26 26 L24 34 L22 26 L14 24 L22 22 Z" stroke="#a87a33" strokeWidth="1.4" fill="none"/>;

export default function Landing() {
  const stageRef    = useRef<HTMLElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const headerRef   = useRef<HTMLElement>(null);
  const catStageRef = useRef<HTMLElement>(null);

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
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500&display=swap";
    document.head.appendChild(link);

    const stage    = stageRef.current;
    const video    = videoRef.current;
    const nav      = headerRef.current;
    const catStage = catStageRef.current;

    if (!stage) return;

    // Autoplay the video
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.play().catch(() => {/* autoplay blocked — video stays paused */});
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
      // Nav scroll style
      if (nav) nav.classList.toggle("is-scrolled", lastY > 50);

      // Category cards stagger
      if (catStage && catScrollH > 0) {
        let cp = (lastY - catStageTop) / catScrollH;
        cp = Math.max(0, Math.min(1, cp));
        document.querySelectorAll(".zs-cat-card").forEach((card, i) => {
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

    const timer = setTimeout(() => {
      updateCatDims();
      tick();
    }, 100);

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
        .zs-root {
          --bg: #ece6da; --text: #1f180d; --muted: #6b5945;
          --gold: #a87a33; --gold-soft: #dcba79;
          --border: rgba(168,122,51,0.15);
          --panel: rgba(253,250,244,0.55);
          --shadow: 0 20px 60px rgba(30,18,5,0.10), 0 0 0 1px rgba(168,122,51,0.08);
          --nav-height: 64px; --zs-sticky-height: 100vh;
          font-family: "Montserrat", sans-serif;
          background: var(--bg); color: var(--text);
        }

        /* NAV */
        .zs-nav {
          position: fixed; top: 0; left: 0; right: 0; height: var(--nav-height);
          z-index: 100; display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(1rem,4vw,3rem);
          transition: background 300ms ease, box-shadow 300ms ease;
        }
        .zs-nav.is-scrolled {
          background: rgba(236,230,218,0.92); backdrop-filter: blur(12px);
          box-shadow: 0 1px 0 rgba(168,122,51,0.12);
        }
        .zs-nav-brand {
          font-family: "Cormorant Garamond", serif; font-size: 1.6rem;
          letter-spacing: 0.25em; color: #fffaf0; text-decoration: none; transition: color 300ms;
        }
        .zs-nav.is-scrolled .zs-nav-brand { color: var(--gold); }
        .zs-nav-shop {
          padding: 0.5rem 1.4rem; border-radius: 999px;
          background: rgba(255,250,240,0.15); border: 1px solid rgba(255,250,240,0.3);
          color: #fffaf0; font-family: "Montserrat",sans-serif; font-size: 0.78rem;
          font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none; transition: all 200ms ease;
        }
        .zs-nav.is-scrolled .zs-nav-shop,
        .zs-nav-shop:hover { background: var(--gold); border-color: var(--gold); color: #fff; }

        /* STAGE */
        .zs-page { position: relative; z-index: 1; }
        .zs-stage { position: relative; height: var(--zs-sticky-height); }
        .zs-sticky {
          position: sticky; top: 0; height: 100vh; width: 100%;
          overflow: hidden; display: flex; align-items: center; justify-content: center;
          background: #140f0a;
        }

        /* VIDEO fills the sticky viewport */
        .zs-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          filter: brightness(0.82) contrast(1.06);
        }

        .zs-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 35%, rgba(20,15,10,0.80) 100%);
          pointer-events: none;
        }

        /* HUD */
        .zs-hud-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          justify-content: space-between; align-items: center;
          padding: calc(var(--nav-height) + 3rem) clamp(1rem,4vw,4rem) 4rem;
          z-index: 2;
        }
        .zs-title-wrap {
          margin: auto; text-align: center; color: #fffaf0;
          text-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        .zs-kicker {
          display: block; color: var(--gold-soft);
          font-family: "Cormorant Garamond",serif; font-size: clamp(1.1rem,1.8vw,1.4rem);
          letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 0.8rem;
        }
        .zs-heading {
          margin: 0; font-family: "Cormorant Garamond",serif;
          font-size: clamp(3rem,7vw,6.5rem); line-height: 1; font-weight: 300; letter-spacing: 0.03em;
        }
        .zs-heading em { font-style: italic; font-weight: 400; color: var(--gold-soft); }
        .zs-hint {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          margin-inline: auto; color: rgba(255,250,240,0.7); will-change: opacity;
        }
        .zs-hint-text { font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase; }
        .zs-hint-line {
          width: 1px; height: 40px;
          background: linear-gradient(180deg,rgba(255,250,240,0.7),transparent);
          position: relative; overflow: hidden;
        }
        .zs-hint-line::after {
          content:''; position:absolute; top:0; left:0; width:100%; height:50%;
          background: var(--gold); animation: hintDown 1.8s infinite ease-in-out;
        }
        @keyframes hintDown {
          0%      { transform: translateY(-100%); }
          80%,100%{ transform: translateY(200%);  }
        }

        /* PROGRESS */
        .zs-progress-container {
          position: absolute; bottom: 0; left: 0; width: 100%; height: 3px;
          background: rgba(255,255,255,0.1); z-index: 3;
        }
        .zs-progress-bar { height: 100%; width: 0%; background: var(--gold); will-change: width; }

        /* NEXT SECTION */
        .zs-next-section {
          position: relative; background: var(--bg); padding: 8rem 0;
          z-index: 2; border-top: 1px solid var(--border);
        }
        .zs-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
        .zs-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 4rem; align-items: center; }
        @media(max-width:900px){ .zs-grid{grid-template-columns:1fr;gap:3rem;} .zs-next-section{padding:5rem 0;} }
        .zs-content-block { display: flex; flex-direction: column; gap: 1.5rem; }
        .zs-sub-kicker { color:var(--gold);font-family:"Cormorant Garamond",serif;font-size:1.1rem;letter-spacing:0.25em;text-transform:uppercase; }
        .zs-section-title { margin:0;font-family:"Cormorant Garamond",serif;font-size:clamp(2.2rem,4.5vw,3.8rem);font-weight:300;line-height:1.15;color:var(--text); }
        .zs-description { margin:0;font-size:1.05rem;line-height:1.7;color:var(--muted); }
        .zs-features { display:flex;flex-direction:column;gap:2rem;margin-top:1.5rem; }
        .zs-feature-item { display:flex;gap:1.5rem; }
        .zs-feature-num { font-family:"Cormorant Garamond",serif;font-size:2.2rem;color:var(--gold);line-height:1;font-weight:300; }
        .zs-feature-title { margin:0 0 0.4rem;font-family:"Montserrat",sans-serif;font-size:1rem;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:var(--text); }
        .zs-feature-desc { margin:0;font-size:0.94rem;color:var(--muted);line-height:1.5; }
        .zs-visual-block { display:flex;justify-content:center; }
        .zs-card-luxury {
          position:relative;width:100%;max-width:320px;aspect-ratio:3/4;padding:2.5rem;
          background:var(--panel);border-radius:1.5rem;backdrop-filter:blur(20px);
          box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;
          text-align:center;transition:transform 0.5s cubic-bezier(0.25,1,0.5,1);
        }
        .zs-card-luxury:hover { transform:translateY(-8px) scale(1.02); }
        .zs-card-border { position:absolute;inset:1rem;border:1px solid var(--border);border-radius:1rem;pointer-events:none; }
        .zs-card-inner { display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%; }
        .zs-card-logo { margin-bottom:1.5rem; }
        .zs-card-logo svg { filter:drop-shadow(0 2px 8px rgba(168,122,51,0.25)); }
        .zs-card-title { margin:0;font-family:"Cormorant Garamond",serif;font-size:1.6rem;letter-spacing:0.15em;font-weight:400;color:var(--gold); }
        .zs-card-divider { width:40px;height:1px;background:var(--gold-soft);margin:1rem 0; }
        .zs-card-text { margin:0;font-size:0.78rem;letter-spacing:0.25em;color:var(--text);font-weight:500; }
        .zs-card-year { margin-top:1.5rem;font-size:0.7rem;letter-spacing:0.15em;color:var(--muted); }

        /* CATEGORIES */
        .zs-categories-section {
          position:relative;height:220vh;
          background:radial-gradient(circle at 70% 30%,rgba(220,186,121,0.08),transparent 50%),
                     linear-gradient(180deg,var(--bg) 0%,#ece6da 100%);
          z-index:2;border-top:1px solid var(--border);
        }
        .zs-categories-sticky {
          position:sticky;top:0;height:100vh;display:flex;flex-direction:column;
          justify-content:center;align-items:center;overflow:hidden;width:100%;
        }
        .zs-cat-container { width:100%;display:flex;flex-direction:column;align-items:center;gap:2.5rem; }
        .zs-categories-header { text-align:center; }
        .zs-categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 280px));
          justify-content: center;
          gap: 2.5rem;
          width: 100%;
        }
        .zs-categories-grid--count-1 {
          grid-template-columns: minmax(280px, 340px);
        }
        .zs-categories-grid--count-2 {
          grid-template-columns: repeat(2, minmax(280px, 330px));
          gap: 6rem;
        }
        .zs-categories-grid--count-3 {
          grid-template-columns: repeat(3, minmax(250px, 290px));
          gap: 3.5rem;
        }
        @media(max-width:900px){
          .zs-categories-grid {
            grid-template-columns: repeat(auto-fit, minmax(240px, 280px));
            gap: 2rem;
          }
          .zs-categories-grid--count-2 {
            grid-template-columns: repeat(2, minmax(220px, 280px));
            gap: 3rem;
          }
        }
        @media(max-width:500px){
          .zs-categories-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .zs-categories-grid--count-2 {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
        .zs-cat-card {
          position:relative;border-radius:24px;
          background:linear-gradient(160deg,#fdfaf4 0%,#f5ede0 100%);
          box-shadow:0 20px 50px rgba(30,18,5,0.08),0 0 0 1px rgba(168,122,51,0.08),inset 0 1px 0 rgba(255,255,255,0.75);
          overflow:visible;padding-top:1.8rem;opacity:0;transform:translateY(60px);
          transition:opacity 650ms cubic-bezier(0.22,1,0.36,1),transform 650ms cubic-bezier(0.22,1,0.36,1),box-shadow 350ms ease;
          will-change:transform,opacity;display:flex;flex-direction:column;
        }
        .zs-cat-card.is-revealed { opacity:1;transform:translateY(0); }
        .zs-cat-card.is-revealed:hover {
          transform:translateY(-8px);
          box-shadow:0 32px 64px rgba(30,18,5,0.14),0 0 0 1px rgba(168,122,51,0.18),inset 0 1px 0 rgba(255,255,255,0.75);
        }
        .zs-cat-card__leaf { position:absolute;top:-1.8rem;width:70px;height:95px;background-repeat:no-repeat;background-size:contain;pointer-events:none;z-index:1; }
        .zs-cat-card__leaf--l { left:-0.8rem;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 130' fill='none'%3E%3Cpath d='M45 120 Q10 80 5 20 Q30 50 45 120Z' fill='%23c9b87a' opacity='0.5'/%3E%3Cpath d='M45 120 Q15 70 12 10' stroke='%23a08840' stroke-width='1' fill='none' opacity='0.5'/%3E%3C/svg%3E");transform:rotate(-18deg); }
        .zs-cat-card__leaf--r { right:-0.8rem;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 130' fill='none'%3E%3Cpath d='M45 120 Q80 80 85 20 Q60 50 45 120Z' fill='%23c9b87a' opacity='0.5'/%3E%3Cpath d='M45 120 Q75 70 78 10' stroke='%23a08840' stroke-width='1' fill='none' opacity='0.5'/%3E%3C/svg%3E");transform:rotate(18deg); }
        .zs-cat-card__badge { position:absolute;top:-1.1rem;left:50%;transform:translateX(-50%);z-index:2;width:2.8rem;height:2.8rem;border-radius:50%;background:#fdfaf4;border:1px solid rgba(168,122,51,0.2);box-shadow:0 4px 12px rgba(120,84,20,0.12);display:grid;place-items:center; }
        .zs-cat-card__badge svg { width:1.4rem;height:1.4rem; }
        .zs-cat-card__img-wrap { width:100%;aspect-ratio:1.1;border-radius:20px 20px 0 0;overflow:hidden;background:linear-gradient(160deg,#f9f4ec,#efe5d4); }
        .zs-cat-card__img-wrap img { width:100%;height:100%;object-fit:cover;display:block;transition:transform 500ms ease; }
        .zs-cat-card:hover .zs-cat-card__img-wrap img { transform:scale(1.04); }
        .zs-cat-card__body { padding:1.2rem 1.4rem 1.6rem;display:flex;flex-direction:column;align-items:center;gap:0.45rem;text-align:center;flex-grow:1; }
        .zs-cat-card__name { margin:0;font-family:"Cormorant Garamond",serif;font-size:clamp(1.25rem,2.2vw,1.5rem);font-weight:400;letter-spacing:0.24em;color:#1f180d; }
        .zs-cat-card__rule { width:1.6rem;height:1px;background:rgba(168,122,51,0.3); }
        .zs-cat-card__sub { margin:0 0 0.5rem;font-family:"Cormorant Garamond",serif;font-size:0.94rem;font-weight:300;color:#6b5945; }
        .zs-cat-card__cta { display:inline-flex;align-items:center;gap:0.4rem;margin-top:auto;padding:0.55rem 1.25rem;border:1px solid rgba(168,122,51,0.3);border-radius:999px;background:transparent;color:#1f180d;text-decoration:none;font-family:"Montserrat",sans-serif;font-size:0.72rem;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;transition:all 200ms ease; }
        .zs-cat-card__cta svg { width:0.9rem;height:0.9rem;transition:transform 200ms ease; }
        .zs-cat-card__cta:hover { background:rgba(168,122,51,0.08);border-color:rgba(168,122,51,0.6);color:var(--gold); }
        .zs-cat-card__cta:hover svg { transform:translateX(3px); }

        /* FOOTER SECTION */
        .zs-footer-section { background:#f5ede0;padding:8rem 0 4rem;border-top:1px solid rgba(168,122,51,0.12);position:relative;z-index:10; }
        .zs-story-grid { display:grid;grid-template-columns:1.2fr 1fr;gap:4rem;margin-bottom:6rem; }
        @media(max-width:860px){ .zs-story-grid{grid-template-columns:1fr;gap:3rem;} }
        .zs-story-content { display:flex;flex-direction:column;align-items:flex-start;gap:1.2rem; }
        .zs-story-title { margin:0;font-family:"Cormorant Garamond",serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:300;line-height:1.1;color:#1f180d; }
        .zs-story-text { margin:0;font-size:0.98rem;line-height:1.7;color:#6b5945; }
        .zs-story-btn { display:inline-flex;align-items:center;padding:0.8rem 2rem;border-radius:999px;font-family:"Montserrat",sans-serif;font-size:0.8rem;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;transition:all 300ms ease; }
        .zs-story-btn--gold { background:#a87a33;color:#fff;box-shadow:0 8px 20px rgba(168,122,51,0.2); }
        .zs-story-btn--gold:hover { background:#8e6527;transform:translateY(-2px);box-shadow:0 12px 24px rgba(168,122,51,0.3); }
        .zs-newsletter-content { background:rgba(255,255,255,0.35);border:1px solid rgba(168,122,51,0.15);border-radius:24px;padding:2.5rem;display:flex;flex-direction:column;gap:1rem;backdrop-filter:blur(10px); }
        .zs-newsletter-title { margin:0;font-family:"Cormorant Garamond",serif;font-size:1.8rem;font-weight:400;color:#1f180d; }
        .zs-newsletter-text { margin:0;font-size:0.92rem;line-height:1.6;color:#6b5945; }
        .zs-newsletter-form { display:flex;gap:0.5rem;margin-top:0.5rem; }
        .zs-newsletter-form input { flex-grow:1;padding:0.8rem 1.2rem;border-radius:999px;border:1px solid rgba(168,122,51,0.25);background:rgba(255,255,255,0.8);font-family:"Montserrat",sans-serif;font-size:0.88rem;color:#1f180d;outline:none;transition:border-color 200ms ease; }
        .zs-newsletter-form input:focus { border-color:#a87a33; }
        .zs-newsletter-form button { padding:0.8rem 1.8rem;border-radius:999px;border:none;background:#1f180d;color:#ece6da;font-family:"Montserrat",sans-serif;font-size:0.8rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:background 200ms ease; }
        .zs-newsletter-form button:hover { background:#a87a33; }
        .zs-site-footer { border-top:1px solid rgba(168,122,51,0.12);padding-top:3rem;display:flex;flex-direction:column;align-items:center;gap:2rem; }
        .zs-footer-brand { font-family:"Cormorant Garamond",serif;font-size:2.2rem;letter-spacing:0.3em;color:#a87a33; }
        .zs-footer-links { display:flex;gap:2.5rem; }
        .zs-footer-links a { font-family:"Montserrat",sans-serif;font-size:0.8rem;color:#6b5945;text-decoration:none;letter-spacing:0.05em;transition:color 200ms ease; }
        .zs-footer-links a:hover { color:#a87a33; }
        .zs-footer-copy { font-family:"Montserrat",sans-serif;font-size:0.75rem;color:#9c8975;letter-spacing:0.02em; }
      `}</style>

      <div className="zs-root">

        {/* ── Navigation ── */}
        <header className="zs-nav" ref={headerRef}>
          <a className="zs-nav-brand" href="/landing">JAMHAWI</a>
          <Link to="/" className="zs-nav-shop">Shop Now</Link>
        </header>

        <main className="zs-page">

          {/* ── Video Hero ── */}
          <section className="zs-stage" ref={stageRef}>
            <div className="zs-sticky">

              <video
                ref={videoRef}
                className="zs-video"
                src="/video3.mp4"
                muted
                autoPlay
                loop
                playsInline
                preload="auto"
              />

              <div className="zs-vignette" />

              {/* Overlay text */}
              <div className="zs-hud-overlay">
                <div className="zs-title-wrap">
                  <span className="zs-kicker">The Art of Details</span>
                  <h1 className="zs-heading">Immersive<br /><em>Purity</em></h1>
                </div>
                <Link to="/" className="zs-nav-shop" style={{ pointerEvents: "all", alignSelf: "center", marginBottom: "2rem" }}>
                  Shop Now
                </Link>
              </div>

            </div>
          </section>

          {/* ── Signature Section ── */}
          <section className="zs-next-section">
            <div className="zs-container">
              <div className="zs-grid">
                <div className="zs-content-block">
                  <span className="zs-sub-kicker">Signature Harvest</span>
                  <h2 className="zs-section-title">A Symphony of Texture &amp; Taste</h2>
                  <p className="zs-description">
                    Our dates are harvested at the peak of maturity under the warm golden sun.
                    Every frame of this video captures the intricate crystallization of natural sugars
                    forming a delicate, caramel-like skin — a sensory journey that begins with visual
                    perfection and ends with exquisite luxury.
                  </p>
                  <div className="zs-features">
                    <div className="zs-feature-item">
                      <span className="zs-feature-num">01</span>
                      <div>
                        <h3 className="zs-feature-title">Pure Origin</h3>
                        <p className="zs-feature-desc">Cultivated in the world-renowned mineral-rich soil of ancient Saudi oases.</p>
                      </div>
                    </div>
                    <div className="zs-feature-item">
                      <span className="zs-feature-num">02</span>
                      <div>
                        <h3 className="zs-feature-title">Hand-Selected</h3>
                        <p className="zs-feature-desc">Each date undergoes rigorous inspection to guarantee optimal texture, moisture, and sweetness.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="zs-visual-block">
                  <div className="zs-card-luxury">
                    <div className="zs-card-border" />
                    <div className="zs-card-inner">
                      <div className="zs-card-logo">
                        <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                          <ellipse cx="18" cy="26" rx="9" ry="12" stroke="#a87a33" strokeWidth="1.4"/>
                          <ellipse cx="30" cy="26" rx="9" ry="12" stroke="#a87a33" strokeWidth="1.4"/>
                          <path d="M18 14 Q24 8 30 14" stroke="#a87a33" strokeWidth="1.4" fill="none"/>
                        </svg>
                      </div>
                      <h4 className="zs-card-title">JAMHAWI GOLD</h4>
                      <div className="zs-card-divider" />
                      <p className="zs-card-text">LIMITED EDITION HARVEST</p>
                      <span className="zs-card-year">EST. 1984</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Categories ── */}
          <section className="zs-categories-section" ref={catStageRef}>
            <div className="zs-categories-sticky">
              <div className="zs-container zs-cat-container">
                <div className="zs-categories-header">
                  <span className="zs-sub-kicker">Our Collection</span>
                  <h2 className="zs-section-title">Shop by Category</h2>
                </div>

                <div className={`zs-categories-grid ${loading ? "zs-categories-grid--count-4" : `zs-categories-grid--count-${categories.length}`}`}>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <article
                        key={i}
                        className="zs-cat-card is-revealed animate-pulse"
                        style={{ opacity: 0.5 }}
                      >
                        <div className="zs-cat-card__img-wrap bg-stone-200" style={{ height: "200px" }} />
                        <div className="zs-cat-card__body">
                          <div className="h-4 bg-stone-300 rounded w-2/3 mb-2" />
                          <div className="h-3 bg-stone-200 rounded w-1/2" />
                        </div>
                      </article>
                    ))
                  ) : (
                    categories.map((cat, i) => {
                      const nameKey = cat.name.toLowerCase();
                      const badge = badgeMapping[nameKey] || fallbackBadge;
                      const sub = subMapping[nameKey] || "Premium Selection";
                      const img = cat.image || imageMapping[nameKey] || "/assets/animations/frames/ezgif-frame-010.jpg";
                      const delay = `${i * 100}ms`;

                      return (
                        <article
                          key={cat.id}
                          className="zs-cat-card"
                          style={{ "--card-delay": delay } as React.CSSProperties}
                        >
                          <div className="zs-cat-card__leaf zs-cat-card__leaf--l" />
                          <div className="zs-cat-card__leaf zs-cat-card__leaf--r" />
                          <div className="zs-cat-card__badge">
                            <svg viewBox="0 0 48 48" fill="none">{badge}</svg>
                          </div>
                          <div className="zs-cat-card__img-wrap">
                            <img src={img} alt={cat.name} />
                          </div>
                          <div className="zs-cat-card__body">
                            <h3 className="zs-cat-card__name">{cat.name}</h3>
                            <div className="zs-cat-card__rule" />
                            <p className="zs-cat-card__sub">{sub}</p>
                            <Link to={`/category/${cat.id}`} className="zs-cat-card__cta">
                              EXPLORE
                              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </Link>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Story & Footer ── */}
          <section className="zs-footer-section">
            <div className="zs-container">
              <div className="zs-story-grid">
                <div className="zs-story-content">
                  <span className="zs-sub-kicker">Our Heritage</span>
                  <h2 className="zs-story-title">A Legacy of Pure Taste</h2>
                  <p className="zs-story-text">
                    For over four decades, Jamhawi has curated the finest agricultural treasures.
                    From the sun-drenched palm groves yielding our signature dates to the organic
                    farms producing rich preserves, every product represents our dedication to
                    pristine quality and traditional craftsmanship.
                  </p>
                  <Link to="/" className="zs-story-btn zs-story-btn--gold">Browse the Store</Link>
                </div>

                <div className="zs-newsletter-content">
                  <h3 className="zs-newsletter-title">Subscribe to the Club</h3>
                  <p className="zs-newsletter-text">Receive exclusive access to seasonal harvests and limited edition collections.</p>
                  <form className="zs-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                    <input type="email" placeholder="Your Email Address" aria-label="Email Address" required />
                    <button type="submit">Join</button>
                  </form>
                </div>
              </div>

              <footer className="zs-site-footer">
                <div className="zs-footer-brand">JAMHAWI</div>
                <div className="zs-footer-links">
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Service</a>
                  <Link to="/">Shop</Link>
                </div>
                <div className="zs-footer-copy">&copy; {new Date().getFullYear()} Jamhawi. All rights reserved.</div>
              </footer>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
