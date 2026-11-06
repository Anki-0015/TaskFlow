'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthService } from '@/services/auth.service';

type Step = 'email' | 'reset' | 'done';

function getErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || fallback;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [delivery, setDelivery] = useState<'gmail' | 'console'>('gmail');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function requestCode() {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await AuthService.requestPasswordReset(email.trim());
      setDelivery(response.data?.delivery || 'gmail');
      setNotice(response.message || 'If an account matches, a reset code will be sent.');
      setStep('reset');
      setResendSeconds(60);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Could not send a reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestCode();
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.resetPassword(email.trim(), code, password);
      if (!response.success) {
        setError(response.message || 'Could not change your password.');
        return;
      }
      setStep('done');
      setNotice(response.message || 'Your password has been changed.');
      setCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (resetError: unknown) {
      setError(getErrorMessage(resetError, 'Could not change your password. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const title = step === 'done'
    ? 'Password changed'
    : step === 'reset'
      ? 'Choose a new password'
      : 'Forgot your password?';
  const description = step === 'done'
    ? 'Your TaskFlow account is ready to use with the new password.'
    : step === 'reset'
      ? 'Enter the six-digit code and choose a secure password for your account.'
      : 'Enter the email address connected to your TaskFlow account and we’ll send a reset code.';

  return (
    <AuthShell
      title={title}
      description={description}
      footer={<>Remembered your password?{' '}<Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Back to sign in</Link></>}
    >
      {step === 'email' && (
        <form onSubmit={handleRequestCode} className="space-y-5">
          <Input
            id="reset-email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={150}
            autoComplete="email"
          />
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>Send verification code</Button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p>{notice}</p>
            {delivery === 'console' && <p className="mt-1 text-xs">For local development, check the backend terminal for the code.</p>}
          </div>
          <p className="text-xs text-gray-500">Enter the code requested for <span className="font-medium text-gray-700">{email}</span>. Codes expire after 10 minutes.</p>
          <Input
            id="reset-code"
            label="Verification code"
            placeholder="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Input
            id="reset-new-password"
            type="password"
            showPasswordToggle
            label="New password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            id="reset-confirm-password"
            type="password"
            showPasswordToggle
            label="Confirm new password"
            placeholder="Enter the password again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>Change password</Button>
          <div className="flex items-center justify-between gap-3 pt-1 text-xs">
            <button type="button" className="font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setStep('email'); setError(''); setNotice(''); setCode(''); setPassword(''); setConfirmPassword(''); }}>
              Change email
            </button>
            <button type="button" className="font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={requestCode} disabled={loading || resendSeconds > 0}>
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-5">
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
          <Link href="/login" className="button-primary inline-flex min-h-12 w-full items-center justify-center rounded-xl px-6 py-2.5 text-base font-semibold transition">
            Sign in with new password
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
