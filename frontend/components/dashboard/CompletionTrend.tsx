'use client';

import { useState } from 'react';

interface TrendPoint {
  date: string;
  count: number;
}

function parseDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const shortDay = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** Daily completed-task bars for the last N days. Single series: no legend, the title names it. */
export default function CompletionTrend({ data }: { data: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((point) => point.count));
  const total = data.reduce((sum, point) => sum + point.count, 0);
  // Round the axis top to a friendly number so the single gridline reads cleanly.
  const axisMax = max <= 4 ? max : Math.ceil(max / 5) * 5;

  const height = 140;
  const barGap = 6;
  const slot = 100 / data.length;
  const activePoint = active === null ? null : data[active];

  return (
    <div>
      <div className="relative" onMouseLeave={() => setActive(null)}>
        {/* Recessive gridlines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[140px] flex-col justify-between" aria-hidden="true">
          <div className="dash-gridline relative border-t border-dashed">
            <span className="absolute -top-2 right-0 bg-[var(--surface)] pl-1 text-[10px] tabular-nums text-gray-400">{axisMax}</span>
          </div>
          <div className="dash-gridline border-t" />
        </div>

        <div className="relative flex h-[140px] items-end" role="img" aria-label={`${total} tasks completed in the last ${data.length} days. Busiest day: ${max} completed.`}>
          {data.map((point, index) => {
            const barHeight = point.count === 0 ? 2 : Math.max(6, (point.count / axisMax) * height);
            return (
              <button
                key={point.date}
                type="button"
                className="group relative flex h-full items-end justify-center focus:outline-none"
                style={{ width: `${slot}%`, paddingInline: barGap / 2 }}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                aria-label={`${longDay.format(parseDay(point.date))}: ${point.count} completed`}
              >
                <span
                  className={`dash-bar block w-full max-w-[22px] rounded-t-[4px] transition-opacity ${point.count === 0 ? 'dash-bar-empty' : ''} ${active !== null && active !== index ? 'opacity-45' : ''} group-focus-visible:ring-2`}
                  style={{ height: barHeight }}
                />
              </button>
            );
          })}
        </div>

        {activePoint && active !== null && (
          <div
            className="dash-tooltip pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${Math.min(92, Math.max(8, (active + 0.5) * slot))}%` }}
            role="status"
          >
            <p className="font-semibold">{activePoint.count} completed</p>
            <p className="opacity-75">{longDay.format(parseDay(activePoint.date))}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-gray-400" aria-hidden="true">
        <span>{data[0] && shortDay.format(parseDay(data[0].date))}</span>
        <span>{data[Math.floor(data.length / 2)] && shortDay.format(parseDay(data[Math.floor(data.length / 2)].date))}</span>
        <span>Today</span>
      </div>

      <table className="sr-only">
        <caption>Tasks completed per day</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Completed</th></tr></thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}><td>{longDay.format(parseDay(point.date))}</td><td>{point.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
