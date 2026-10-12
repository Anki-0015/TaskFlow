'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDate, toDateInputValue } from '@/utils/date';

interface DatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export default function DatePicker({ id, label, value, onChange, min, placeholder = 'Choose a date', align = 'left' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDate(value);
    const now = selected || new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const minimumDate = parseDate(min || '');
  const today = new Date();
  const calendarStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  calendarStart.setDate(1 - calendarStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth);
  const minMonth = minimumDate ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1) : null;
  const previousDisabled = Boolean(minMonth && visibleMonth.getTime() <= minMonth.getTime());

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function openCalendar() {
    const current = selectedDate || new Date();
    setVisibleMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setIsOpen((open) => !open);
  }

  function chooseDate(date: Date) {
    const dateValue = toDateInputValue(date);
    if (min && dateValue < min) return;
    onChange(dateValue);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${id}-calendar`}
        onClick={openCalendar}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left text-sm text-gray-900 shadow-sm transition duration-150 hover:border-blue-300 hover:shadow-md focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15"
      >
        <span className={value ? 'font-medium' : 'text-gray-400'}>{value ? formatDate(value) : placeholder}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600">
          <rect x="3.5" y="5" width="17" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div id={`${id}-calendar`} role="dialog" aria-label={`${label} calendar`} className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-50 mt-2 w-[min(19rem,calc(100vw-3rem))] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 animate-fade-in`}>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              disabled={previousDisabled}
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous month"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="m12.5 4.5-5 5.5 5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label="Next month"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="m7.5 4.5 5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <span key={weekday} className="py-2">{weekday}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((date) => {
              const dateValue = toDateInputValue(date);
              const isSelected = Boolean(selectedDate && sameDay(date, selectedDate));
              const isToday = sameDay(date, today);
              const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const isDisabled = Boolean(min && dateValue < min);
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}
                  aria-pressed={isSelected}
                  onClick={() => chooseDate(date)}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm transition ${
                    isSelected
                      ? 'bg-blue-600 font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700'
                      : isToday
                        ? 'font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50'
                        : isOutsideMonth
                          ? 'text-gray-300 hover:bg-gray-100 hover:text-gray-700'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  } disabled:cursor-not-allowed disabled:opacity-25`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <button type="button" onClick={() => onChange('')} className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800">
              Clear date
            </button>
            <button
              type="button"
              disabled={Boolean(min && toDateInputValue(today) < min)}
              onClick={() => chooseDate(today)}
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
