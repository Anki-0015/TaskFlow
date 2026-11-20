import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="app-canvas flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold tracking-[.16em] text-blue-600">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">We couldn’t find that page</h1>
        <p className="mt-2 text-sm text-gray-500">The link may be broken, or the page may have been moved.</p>
        <Link href="/dashboard" className="button-primary mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
