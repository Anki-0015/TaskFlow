'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/index';
import { showToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { AdminManagedUser, AdminOverview, AdminService, AdminUsersPage, AccountRole } from '@/services/admin.service';

const PAGE_SIZE = 20;

interface RoleChange {
  user: AdminManagedUser;
  role: AccountRole;
}

function responseMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [userPage, setUserPage] = useState<AdminUsersPage | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pendingChange, setPendingChange] = useState<RoleChange | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') router.replace('/dashboard');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    setLoadError('');
    try {
      const [overviewResponse, usersResponse] = await Promise.all([
        AdminService.getOverview(),
        AdminService.getUsers(search, page, PAGE_SIZE),
      ]);
      if (!overviewResponse.success || !overviewResponse.data || !usersResponse.success || !usersResponse.data) {
        throw new Error('Could not load administrator data.');
      }
      setOverview(overviewResponse.data);
      setUserPage(usersResponse.data);
    } catch (error) {
      setLoadError(responseMessage(error) || 'Could not load administrator data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, search, page]);

  useEffect(() => { void load(); }, [load]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function confirmRoleChange() {
    if (!pendingChange) return;
    setSavingRole(true);
    try {
      const response = await AdminService.updateUserRole(pendingChange.user.id, pendingChange.role);
      if (!response.success) throw new Error(response.message || 'Could not change account role.');
      showToast(`${pendingChange.user.name} is now ${pendingChange.role === 'admin' ? 'an administrator' : 'a member'}.`, 'success');
      setPendingChange(null);
      await load();
    } catch (error) {
      showToast(responseMessage(error) || (error instanceof Error ? error.message : 'Could not change account role.'), 'error');
    } finally {
      setSavingRole(false);
    }
  }

  const isAdmin = user?.role === 'admin';
  const pages = userPage ? Math.max(1, Math.ceil(userPage.total / PAGE_SIZE)) : 1;
  const summaryCards = overview ? [
    { label: 'Accounts', value: overview.users, hint: `${overview.admins} administrators · ${overview.members} members` },
    { label: 'Projects', value: overview.projects, hint: 'Across the workspace' },
    { label: 'Tasks', value: overview.tasks, hint: 'Across all projects' },
  ] : [];

  return (
    <DashboardLayout title="Admin">
      {authLoading ? <PageLoader /> : !isAdmin ? null : (
        <div className="animate-fade-in space-y-6">
          <div className="page-intro">
            <p className="page-eyebrow">Administration</p>
            <h2 className="page-title">Workspace overview</h2>
            <p className="page-description">Review account and workspace totals, then manage who can administer TaskFlow.</p>
          </div>

          {overview && (
            <div className="grid gap-4 sm:grid-cols-3">
              {summaryCards.map((item) => (
                <Card key={item.label} className="dashboard-stat min-h-28 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{item.value.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Account management</h3>
                <p className="mt-1 text-sm text-gray-500">Promote trusted users or remove administrator access.</p>
              </div>
              <form onSubmit={handleSearch} className="flex w-full gap-2 sm:max-w-md">
                <label htmlFor="admin-user-search" className="sr-only">Search accounts</label>
                <input
                  id="admin-user-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search name, username or email"
                  maxLength={100}
                  className="field-control h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" variant="secondary" size="sm">Search</Button>
              </form>
            </div>

            {loadError && (
              <div role="alert" className="m-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{loadError}</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>Retry</Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">Account</th>
                    <th scope="col" className="px-5 py-3">Email</th>
                    <th scope="col" className="px-5 py-3">Role</th>
                    <th scope="col" className="px-5 py-3">Joined</th>
                    <th scope="col" className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading && !userPage ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><PageLoader /></td></tr>
                  ) : userPage?.users.length ? userPage.users.map((account) => {
                    const isSelf = account.id === user?.id;
                    const nextRole: AccountRole = account.role === 'admin' ? 'member' : 'admin';
                    const cannotDemoteLastAdmin = account.role === 'admin' && (overview?.admins || 0) <= 1;
                    return (
                      <tr key={account.id} className="hover:bg-gray-50/70">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                              {account.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{account.name}{isSelf ? <span className="ml-2 text-xs font-normal text-gray-500">You</span> : null}</p>
                              <p className="truncate text-xs text-gray-500">@{account.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{account.email}</td>
                        <td className="px-5 py-4"><Badge label={account.role} /></td>
                        <td className="px-5 py-4 whitespace-nowrap text-gray-500">{new Date(account.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          {isSelf ? <span className="text-xs text-gray-400">Current account</span> : (
                            <Button
                              type="button"
                              size="sm"
                              variant={nextRole === 'member' ? 'secondary' : 'primary'}
                              disabled={cannotDemoteLastAdmin}
                              title={cannotDemoteLastAdmin ? 'TaskFlow must keep at least one administrator.' : undefined}
                              onClick={() => setPendingChange({ user: account, role: nextRole })}
                            >
                              {nextRole === 'admin' ? 'Make admin' : 'Make member'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">{loading ? 'Loading accounts…' : 'No accounts match that search.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-500">
                {userPage ? `${userPage.total.toLocaleString()} account${userPage.total === 1 ? '' : 's'} · Page ${page} of ${pages}` : 'Loading account list…'}
                {loading && userPage ? ' · Refreshing' : ''}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button type="button" variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          </Card>

          <Modal
            isOpen={Boolean(pendingChange)}
            onClose={() => { if (!savingRole) setPendingChange(null); }}
            title={pendingChange?.role === 'admin' ? 'Promote account?' : 'Remove administrator access?'}
            size="sm"
          >
            <p className="text-sm leading-6 text-gray-600">
              {pendingChange?.role === 'admin'
                ? `${pendingChange.user.name} will be able to view workspace-wide totals and manage account roles.`
                : `${pendingChange?.user.name} will lose administrator access.`}
              {' '}Their active sessions will end and they will need to sign in again.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setPendingChange(null)} disabled={savingRole}>Cancel</Button>
              <Button type="button" variant={pendingChange?.role === 'admin' ? 'primary' : 'danger'} onClick={() => void confirmRoleChange()} loading={savingRole}>
                {pendingChange?.role === 'admin' ? 'Promote to admin' : 'Remove admin access'}
              </Button>
            </div>
          </Modal>
        </div>
      )}
    </DashboardLayout>
  );
}
