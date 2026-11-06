'use client';

import { useState, FormEvent, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { AuthService } from '@/services/auth.service';
import { showToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name,        setName]        = useState(user?.name || '');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!user) return;
    const frame = window.requestAnimationFrame(() => setName(user.name));
    return () => window.cancelAnimationFrame(frame);
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const updates: { name?: string; password?: string } = {};
      if (name.trim() !== user?.name) updates.name = name.trim();
      if (password) updates.password = password;

      if (Object.keys(updates).length === 0) {
        showToast('No changes to save.', 'info');
        return;
      }

      const res = await AuthService.updateProfile(updates);
      if (res.success) {
        showToast('Profile updated.', 'success');
        await refreshUser();
        setPassword('');
        setConfirm('');
      } else {
        setError(res.message || 'Update failed.');
      }
    } catch {
      setError('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Profile">
      <div className="animate-fade-in max-w-2xl space-y-6">
        <div className="page-intro">
          <p className="page-eyebrow">Personal settings</p>
          <h2 className="page-title">Your profile</h2>
          <p className="page-description">Update your details and manage your sign-in credentials.</p>
        </div>
        {/* Avatar / info card */}
        <Card className="profile-card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="brand-mark flex h-14 w-14 items-center justify-center rounded-[18px] text-xl font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1">
                <Badge label={user?.role || 'member'} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <p className="font-medium text-gray-700">Member since</p>
              <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Account ID</p>
              <p>#{user?.id}</p>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <Card className="profile-form-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Edit Profile</h3>
          </div>
          <div className="px-5 py-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="profile-name"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                id="profile-email"
                type="email"
                label="Email"
                value={user?.email || ''}
                disabled
              />
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">Leave password blank to keep current.</p>
                <div className="space-y-4">
                  <Input
                    id="new-password"
                    type="password"
                    showPasswordToggle
                    autoComplete="new-password"
                    label="New Password"
                    placeholder="min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    showPasswordToggle
                    autoComplete="new-password"
                    label="Confirm Password"
                    placeholder="repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save Changes</Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
