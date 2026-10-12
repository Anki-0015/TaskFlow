'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectService } from '@/services/project.service';
import { ProjectInvitation } from '@/types';
import { EmptyState, PageLoader } from '@/components/ui';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/utils/date';

export default function NotificationsPage() {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await ProjectService.getInvitations();
      if (!response.success) throw new Error(response.message || 'Could not load notifications.');
      setInvitations(response.data || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the inbox request; data is applied when it resolves.
  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  async function respond(invitation: ProjectInvitation, action: 'ACCEPT' | 'DECLINE') {
    setBusyId(invitation.id);
    try {
      await ProjectService.respondToInvitation(invitation.id, action);
      setInvitations((items) => items.map((item) => item.id === invitation.id
        ? { ...item, status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' }
        : item));
      window.dispatchEvent(new Event('taskflow:notifications-updated'));
      showToast(action === 'ACCEPT' ? `You joined ${invitation.project_name}.` : 'Invitation declined.', 'success');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(message || 'Could not update invitation.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = invitations.filter((item) => item.status === 'PENDING').length;

  return (
    <DashboardLayout title="Notifications">
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-blue-600">Your inbox</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">Project invitations and requests that need your response.</p>
        </div>
        {loading ? <PageLoader /> : invitations.length === 0 ? (
          <EmptyState icon="🔔" title="You’re all caught up" description="New project invitations will show up here." />
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{invitation.project_name}</h3>
                      <Badge label={invitation.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">{invitation.invited_by_name}</span> invited you as a {invitation.role.toLowerCase()}.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Received {formatDateTime(invitation.created_at)}</p>
                  </div>
                  {invitation.status === 'PENDING' ? (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" disabled={busyId === invitation.id} onClick={() => respond(invitation, 'DECLINE')}>Decline</Button>
                      <Button disabled={busyId === invitation.id} onClick={() => respond(invitation, 'ACCEPT')}>Accept invitation</Button>
                    </div>
                  ) : invitation.status === 'ACCEPTED' ? (
                    <Link href={`/projects/${invitation.project_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">Open project →</Link>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
        {pendingCount > 0 && <p className="text-xs text-gray-400">{pendingCount} invitation{pendingCount === 1 ? '' : 's'} waiting for your response.</p>}
      </div>
    </DashboardLayout>
  );
}
