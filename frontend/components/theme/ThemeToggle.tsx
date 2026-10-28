'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={toggleTheme}
      className="theme-control inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3 transition-colors"
    >
      <span className="flex h-5 w-5 items-center justify-center text-gray-500" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.3 15.3A8.5 8.5 0 0 1 8.7 3.7 8.5 8.5 0 1 0 20.3 15.3Z" />
        </svg>
      </span>
      <span className={`theme-switch relative h-6 w-[42px] rounded-full transition-colors ${isDark ? 'theme-switch-on' : ''}`} aria-hidden="true">
        <span className={`theme-switch-knob absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full shadow-sm transition-transform duration-200 ${isDark ? 'translate-x-[18px]' : ''}`} />
      </span>
    </button>
  );
}
