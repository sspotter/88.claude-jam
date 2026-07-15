import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setUserLanguage } from '../i18n';
import { X, Home, ShoppingCart, LogIn, List, Phone, Search, Sun, Moon } from 'lucide-react';
import CurrencySelector from './CurrencySelector';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  cartCount,
  isDark,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}: MobileMenuProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const isArabic = i18n.language === 'ar';

  const menuItems = [
    { label: t('home'),       icon: Home,         path: '/landing2' },
    { label: t('categories'), icon: List,         path: '/shop' },
    { label: t('cart'),       icon: ShoppingCart, path: '/cart', badge: cartCount },
    { label: i18n.language === 'ar' ? 'تواصل معنا' : 'Contact Us', icon: Phone, path: '/shop/contact' },
    { label: t('admin'),      icon: LogIn,        path: '/admin/login' },
  ];

  const handleNavigation = (path: string) => {
    onClose();
    if (path.includes('#')) {
      const [basePath, anchor] = path.split('#');
      navigate(basePath);
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: right side for Arabic, left side for English */}
      <div
        style={{
          position: 'absolute', [isArabic ? 'right' : 'left']: 0, top: 0,
          height: '100%', width: '18rem',
          background: 'var(--th-surface)',
          borderLeft: isArabic ? '1px solid var(--th-nav-border)' : 'none',
          borderRight: isArabic ? 'none' : '1px solid var(--th-nav-border)',
          display: 'flex', flexDirection: 'column',
          boxShadow: isArabic ? '-24px 0 64px rgba(0,0,0,0.4)' : '24px 0 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header: backdrop matches whichever logo variant is showing */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: isDark ? 'rgba(13,13,13,0.99)' : '#FFFFFF',
            borderBottom: '1px solid var(--th-nav-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <img
            src={
              isArabic
                ? (isDark ? '/nav-logo-eng.png' : '/nav-logo-eng-light.png')
                : (isDark ? '/nav-logo-eng.png' : '/nav-logo-eng-light.png')
            }
            alt={t('jamhawi')}
            style={{ height: '2.25rem', width: 'auto', objectFit: 'contain' }}
          />
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: '2.25rem', height: '2.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', border: '1px solid var(--th-outline)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--th-muted)', transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-gold)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--th-gold)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-muted)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--th-outline)';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem 1.25rem 0' }}>
          <form onSubmit={onSearchSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={i18n.language === 'ar' ? 'ابحث عن منتجات...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 2.25rem 0.6rem 1rem',
                borderRadius: '9999px',
                border: '1px solid var(--th-outline)',
                background: 'var(--th-search-bg)',
                color: 'var(--th-text)',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
            <Search
              style={{
                position: 'absolute', right: '0.85rem', top: '50%',
                transform: 'translateY(-50%)', width: '1rem', height: '1rem',
                color: 'var(--th-muted)',
              }}
            />
          </form>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 1rem',
                borderRadius: '0.375rem',
                border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
                color: 'var(--th-text-variant)',
                fontSize: '0.88rem', fontWeight: 600,
                letterSpacing: '0.03em',
                transition: 'background 200ms ease, color 200ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(158,123,40,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-gold)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-text-variant)';
              }}
            >
              <item.icon
                style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0, color: 'inherit' }}
              />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#f2ca50', color: '#131313',
                    fontSize: '0.65rem', fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    minWidth: '1.25rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div
          style={{
            padding: '1rem 1.25rem 0.5rem',
            borderTop: '1px solid var(--th-nav-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <CurrencySelector compact />
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            style={{
              width: '2.4rem', height: '2.4rem',
              borderRadius: '50%',
              border: '1px solid var(--th-outline)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--th-text-variant)',
              flexShrink: 0,
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Language toggle */}
        <div
          style={{
            padding: '0.5rem 1.25rem 1rem',
          }}
        >
          <button
            onClick={() => {
              setUserLanguage(i18n.language === 'ar' ? 'en' : 'ar');
            }}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--th-outline)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--th-text-variant)',
              fontSize: '0.82rem', fontWeight: 700,
              letterSpacing: '0.06em',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--th-gold)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-gold)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(158,123,40,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--th-outline)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--th-text-variant)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {i18n.language === 'ar' ? 'Switch to English' : 'التغيير إلى العربية'}
          </button>
        </div>
      </div>
    </div>
  );
}
