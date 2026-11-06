import type { ReactNode } from 'react';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface AuthShellProps {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}

const previewTasks = [
  { title: 'Finalize homepage flow', status: 'In progress', tone: 'bg-amber-300' },
  { title: 'Review launch checklist', status: 'To do', tone: 'bg-white/55' },
  { title: 'Share designs with the team', status: 'Done', tone: 'bg-emerald-300' },
];

export default function AuthShell({ title, description, footer, children }: AuthShellProps) {
  return (
    <main className="auth-shell grid lg:grid-cols-[minmax(0,1.08fr)_minmax(470px,.92fr)]">
      <section className="auth-story hidden min-h-dvh items-center px-12 py-16 lg:flex xl:px-20">
        <div className="mx-auto w-full max-w-[620px]">
          <div className="mb-16 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/25 bg-white/15 backdrop-blur">
              <span className="text-xs font-bold tracking-tight text-white">TF</span>
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight text-white">TaskFlow</p>
              <p className="text-[11px] font-medium text-cyan-50/80">Project workspace</p>
            </div>
          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-cyan-50/80">Make space for focused work</p>
          <h2 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-.04em] text-white xl:text-5xl">
            Bring every project into focus.
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-cyan-50/85">
            Plan the next step, keep your team in sync, and turn a busy list into steady progress.
          </p>

          <div className="auth-preview mt-12 max-w-[520px] rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-cyan-50/80">YOUR WORKSPACE</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">Website redesign</h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> In progress
              </span>
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-100 to-emerald-200" />
            </div>
            <div className="space-y-2">
              {previewTasks.map((task, index) => (
                <div key={task.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.08] px-3.5 py-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${task.tone}`}>
                    {index === 2 && <span className="text-[10px] font-bold text-emerald-900">✓</span>}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-xs font-medium ${index === 2 ? 'text-cyan-50/65 line-through' : 'text-white'}`}>{task.title}</span>
                  <span className="shrink-0 text-[10px] font-medium text-cyan-50/75">{task.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
              <div className="flex -space-x-2">
                {['A', 'J', 'M'].map((letter, index) => (
                  <span key={letter} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0b7888] text-[10px] font-bold text-cyan-950 ${['bg-pink-200', 'bg-cyan-200', 'bg-amber-200'][index]}`}>
                    {letter}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-medium text-cyan-50/80">Better work, together</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-4 py-14 sm:px-8">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[470px]">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-[14px]">
              <span className="text-xs font-bold text-white">TF</span>
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">TaskFlow</span>
          </div>
          <div className="auth-card rounded-[28px] p-6 sm:p-9">
            <div className="mb-7">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-blue-600">TaskFlow account</p>
              <h1 className="text-2xl font-bold tracking-[-.03em] text-gray-900">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
            </div>
            {children}
          </div>
          <p className="mt-5 text-center text-sm text-gray-500">{footer}</p>
        </div>
      </section>
    </main>
  );
}
