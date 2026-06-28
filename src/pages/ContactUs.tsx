import React from "react";
import { useTranslation } from "react-i18next";
import { Phone, MapPin, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const PHONE_NUMBER = "+201008988663";

export default function ContactUs() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(PHONE_NUMBER);
      toast.success(isAr ? "تم نسخ الرقم" : "Number copied");
    } catch {
      toast.error(isAr ? "تعذّر نسخ الرقم" : "Couldn't copy number");
    }
  };

  return (
    <div
      className="ctc-root"
      style={{
        "--ctc-bg":        "var(--th-bg,          #131313)",
        "--ctc-surface":   "var(--th-surface,     #1a1a1a)",
        "--ctc-text":      "var(--th-text,        #e5e2e1)",
        "--ctc-muted":     "var(--th-muted,       #a0a0a0)",
        "--ctc-gold":      "var(--th-gold,        #f2ca50)",
        "--ctc-gold-dim":  "var(--th-gold-dim,    #e9c349)",
        "--ctc-outline":   "var(--th-outline,     rgba(212,175,55,0.20))",
      } as React.CSSProperties}
    >
      <style>{`
        .ctc-root {
          max-width: 860px;
          margin: 0 auto;
          padding: 2.5rem 1rem 4rem;
          color: var(--ctc-text);
        }

        /* ── Page title ── */
        .ctc-title {
          font-family: 'Maj', serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--ctc-gold);
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .ctc-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--ctc-gold-dim), transparent);
          margin: 0 auto 2.5rem;
          max-width: 320px;
        }

        /* ── Info cards row ── */
        .ctc-info-row {
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .ctc-info-card {
          flex: 1 1 220px;
          background: var(--ctc-surface);
          border: 1px solid var(--ctc-outline);
          border-radius: 16px;
          padding: 1.5rem 1.75rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          transition: border-color 220ms ease, box-shadow 220ms ease;
        }
        .ctc-info-card:hover {
          border-color: rgba(242,202,80,0.35);
          box-shadow: 0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(242,202,80,0.15);
        }
        .ctc-icon-wrap {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 50%;
          background: rgba(242,202,80,0.08);
          border: 1px solid var(--ctc-outline);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--ctc-gold);
        }
        .ctc-info-label {
          font-size: 0.7rem;
          font-family: 'Maj', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ctc-muted);
          margin-bottom: 0.35rem;
        }
        .ctc-info-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--ctc-text);
          font-family: 'Maj', sans-serif;
          direction: ltr;
          unicode-bidi: embed;
        }
        .ctc-info-value a {
          color: var(--ctc-gold);
          text-decoration: none;
          transition: opacity 150ms;
        }
        .ctc-info-value a:hover {
          opacity: 0.8;
        }

        /* ── Phone action icons ── */
        .ctc-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.65rem;
        }
        .ctc-action-btn {
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(242,202,80,0.08);
          border: 1px solid var(--ctc-outline);
          color: var(--ctc-gold);
          cursor: pointer;
          text-decoration: none;
          transition: background 150ms ease, border-color 150ms ease;
        }
        .ctc-action-btn:hover {
          background: rgba(242,202,80,0.18);
          border-color: rgba(242,202,80,0.40);
        }

        /* ── Map ── */
        .ctc-map-wrap {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--ctc-outline);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          line-height: 0;
        }
        .ctc-map-wrap iframe {
          width: 100%;
          height: 420px;
          border: none;
          display: block;
        }
        @media (max-width: 540px) {
          .ctc-map-wrap iframe { height: 280px; }
          .ctc-info-row { flex-direction: column; }
        }
      `}</style>

      <h1 className="ctc-title">
        {isAr ? "تواصل معنا" : "Contact Us"}
      </h1>
      <div className="ctc-divider" />

      {/* Info cards */}
      <div className="ctc-info-row">

        {/* Phone */}
        <div className="ctc-info-card">
          <div className="ctc-icon-wrap">
            <Phone size={16} />
          </div>
          <div>
            <p className="ctc-info-label">{isAr ? "رقم الهاتف" : "Phone"}</p>
            <p className="ctc-info-value">+20 100 898 8663</p>
            <div className="ctc-actions">
              <button
                type="button"
                className="ctc-action-btn"
                onClick={handleCopyPhone}
                aria-label={isAr ? "نسخ الرقم" : "Copy number"}
                title={isAr ? "نسخ الرقم" : "Copy number"}
              >
                <Copy size={15} />
              </button>
              <a
                className="ctc-action-btn"
                href="https://wa.me/201008988663"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={isAr ? "إرسال رسالة عبر واتساب" : "Send a WhatsApp message"}
                title={isAr ? "إرسال رسالة عبر واتساب" : "Send a WhatsApp message"}
              >
                <MessageCircle size={15} />
              </a>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="ctc-info-card">
          <div className="ctc-icon-wrap">
            <MapPin size={16} />
          </div>
          <div>
            <p className="ctc-info-label">{isAr ? "العنوان" : "Address"}</p>
            <p className="ctc-info-value" style={{ direction: "auto" }}>
              {isAr
                ? "٨٥ شارع عمرو النجومي، الإسكندرية، مصر"
                : "85 Amr El-Negoumy Street, Alexandria, Egypt"}
            </p>
          </div>
        </div>

      </div>

      {/* Map */}
      <div className="ctc-map-wrap">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d213.1653986921693!2d29.98540922856086!3d31.258211201186942!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2seg!4v1780941233821!5m2!1sen!2seg"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={isAr ? "موقعنا على الخريطة" : "Our location on the map"}
        />
      </div>
    </div>
  );
}
