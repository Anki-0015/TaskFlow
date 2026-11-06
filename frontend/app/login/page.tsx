'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthShell from '@/components/layout/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.replace('/dashboard');
    } else {
      setError(result.message || 'Login failed.');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up where you left off."
      footer={<>New to TaskFlow?{' '}<Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          type="password"
          showPasswordToggle
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="-mt-2 flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 transition hover:text-blue-700">Forgot password?</Link>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign in to TaskFlow
        </Button>
      </form>
    </AuthShell>
  );
}
