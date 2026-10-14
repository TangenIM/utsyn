'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from './LocaleProvider';
import { IconContrast } from './Icons';

export default function A11yToolbar() {
  const { t } = useLocale();
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    try {
    const savedScale = localStorage.getItem('utsyn_font_scale');
    const savedContrast = localStorage.getItem('utsyn_high_contrast');
    if (savedScale) {
      const scale = parseFloat(savedScale);
      if (Number.isFinite(scale) && scale >= 0.8 && scale <= 1.6) {
        setFontScale(scale);
        document.documentElement.style.setProperty('--font-scale', String(scale));
      }
    }
    if (savedContrast === 'true') {
      setHighContrast(true);
      document.documentElement.setAttribute('data-contrast', 'high');
    }
    } catch { /* Browser storage can be disabled. Controls still work. */ }
  }, []);

  const changeFontSize = (delta: number) => {
    const newScale = Math.max(0.8, Math.min(1.6, fontScale + delta));
    setFontScale(newScale);
    document.documentElement.style.setProperty('--font-scale', String(newScale));
    try { localStorage.setItem('utsyn_font_scale', String(newScale)); } catch {}
  };

  const toggleContrast = () => {
    const newVal = !highContrast;
    setHighContrast(newVal);
    if (newVal) {
      document.documentElement.setAttribute('data-contrast', 'high');
    } else {
      document.documentElement.removeAttribute('data-contrast');
    }
    try { localStorage.setItem('utsyn_high_contrast', String(newVal)); } catch {}
  };

  return (
    <div className="a11y-toolbar" role="toolbar" aria-label="Tilgjengelighetsverktoy">
      <button
        className="a11y-btn"
        onClick={() => changeFontSize(0.1)}
        aria-label={t('a11y_increase_font')}
        title={t('a11y_increase_font')}
      >
        A+
      </button>
      <button
        className="a11y-btn"
        onClick={() => changeFontSize(-0.1)}
        aria-label={t('a11y_decrease_font')}
        title={t('a11y_decrease_font')}
      >
        A-
      </button>
      <button
        className="a11y-btn"
        onClick={toggleContrast}
        aria-label={t('a11y_high_contrast')}
        title={t('a11y_high_contrast')}
        aria-pressed={highContrast}
      >
        <IconContrast size={18} />
      </button>
    </div>
  );
}
