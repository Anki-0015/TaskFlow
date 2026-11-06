'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthShell from '@/components/layout/AuthShell';

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
    <AuthShell
      title="Create your account"
      description="Set up your workspace and start moving projects forward."
      footer={<>Already have an account?{' '}<Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link></>}
    >
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

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
