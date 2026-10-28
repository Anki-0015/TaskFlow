'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();

  const [form,    setForm]    = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.register(form.name, form.username, form.email, form.password);
      if (res.success) {
        setSuccess('Account created! Redirecting to login...');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const networkError = (err as { code?: string })?.code === 'ERR_NETWORK';
      const msg = responseMessage || (networkError
        ? 'Can’t reach the TaskFlow API. Make sure the backend is running at http://localhost:5001.'
        : 'Registration failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-[460px] py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-white font-bold text-sm">TF</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-2">Create an account to join your workspace.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Full Name"
              placeholder="Alice Johnson"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
            <Input
              id="username"
              label="Username"
              placeholder="e.g. alicej"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
              required
            />
            <Input
              id="reg-email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
            <Input
              id="reg-password"
              type="password"
              showPasswordToggle
              label="Password"
              placeholder="min. 6 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
            <Input
              id="confirm-password"
              type="password"
              showPasswordToggle
              label="Confirm Password"
              placeholder="repeat password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => handleChange('confirm', e.target.value)}
              required
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {success}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
