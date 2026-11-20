'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-canvas flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-lg font-bold text-red-600" aria-hidden="true">!</div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">An unexpected error occurred. Try again, and if it keeps happening, reload the page.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-gray-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="button-primary inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">Try again</button>
          <a href="/dashboard" className="button-secondary inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">Dashboard</a>
        </div>
      </div>
    </main>
  );
}
