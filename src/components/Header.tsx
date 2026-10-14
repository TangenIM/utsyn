'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLocale } from './LocaleProvider';
import { IconMenu, IconX } from './Icons';

export default function Header() {
  const { locale, setLocale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('a11y_skip_nav')}</a>
      <header className="header" role="banner">
        <div className="header-inner">
          <Link href="/" className="logo" aria-label={locale === 'no' ? 'Restaurant Utsyn - Hjem' : 'Restaurant Utsyn - Home'}>
            <Image width={300} height={200} src="/utsyn_logo.png" alt="Restaurant Utsyn Logo" className="logo-img" aria-hidden="true" />
          </Link>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={locale === 'no' ? (menuOpen ? 'Lukk meny' : 'Åpne meny') : (menuOpen ? 'Close menu' : 'Open menu')}
          >
            {menuOpen ? <IconX size={22} /> : <IconMenu size={22} />}
          </button>

          <nav id="main-nav" className={`nav ${menuOpen ? 'nav-open' : ''}`} role="navigation" aria-label={locale === 'no' ? 'Hovednavigasjon' : 'Main navigation'}>
            <Link href="/" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t('nav_home')}
            </Link>
            <Link href="/bestill" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t('nav_book')}
            </Link>
            <Link href="/#om-oss" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t('nav_about')}
            </Link>
            <Link href="/#kontakt" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t('nav_contact')}
            </Link>
            <button
              className="lang-toggle"
              onClick={() => setLocale(locale === 'no' ? 'en' : 'no')}
              aria-label={`Switch to ${locale === 'no' ? 'English' : 'Norsk'}`}
            >
              {locale === 'no' ? 'EN' : 'NO'}
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
