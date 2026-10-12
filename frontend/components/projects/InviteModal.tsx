'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ProjectMember } from '@/types';
import { ProjectService } from '@/services/project.service';
import { showToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

/* ─── types ──────────────────────────────────────────────────────────── */
type Role = 'MANAGER' | 'MEMBER' | 'VIEWER';

interface PendingInvite {
  email: string;
  role: Role;
  id: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  existingMembers: ProjectMember[];
  onMembersChange: (members: ProjectMember[]) => void;
}

/* ─── Constants ──────────────────────────────────────────────────────── */
const ROLE_META: Record<Role, { label: string; description: string }> = {
  MANAGER: { label: 'Manager', description: 'Can edit project, manage tasks and members' },
  MEMBER:  { label: 'Member',  description: 'Can view and manage tasks' },
  VIEWER:  { label: 'Viewer',  description: 'Read-only access to project and tasks' },
};

const ROLE_COLORS: Record<string, string> = {
  OWNER:   'text-amber-700 bg-amber-50 border-amber-200',
  MANAGER: 'text-purple-600 bg-purple-50 border-purple-200',
  MEMBER:  'text-blue-600 bg-blue-50 border-blue-200',
  VIEWER:  'text-gray-600 bg-gray-50 border-gray-200',
};

/* ─── Avatar helper ──────────────────────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const sizeClasses = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-10 h-10 text-base' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = ((hash % 360) + 360) % 360;
  return (
    <span
      className={`flex-shrink-0 flex items-center justify-center rounded-full font-bold ${sizeClasses[size]}`}
      style={{ background: `hsl(${hue} 65% 88%)`, color: `hsl(${hue} 55% 35%)` }}
    >
      {initials}
    </span>
  );
}

/* ─── MemberRow ──────────────────────────────────────────────────────── */
function MemberRow({
  member,
  isOwner,
  removing,
  onRemove,
}: {
  member: ProjectMember;
  isOwner: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-gray-50 group transition-colors">
      <Avatar name={member.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
        <p className="text-xs text-gray-400 truncate">@{member.username}</p>
      </div>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
          ROLE_COLORS[member.role] ?? 'text-gray-600 bg-gray-50 border-gray-200'
        }`}
      >
        {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
      </span>
      {!isOwner && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
          aria-label={`Remove ${member.name}`}
        >
          {removing ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function InviteModal({
  isOpen,
  onClose,
  projectId,
  existingMembers,
  onMembersChange,
}: InviteModalProps) {
  const [inputValue, setInputValue]     = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sending, setSending]           = useState(false);
  const [members, setMembers]           = useState<ProjectMember[]>(existingMembers);
  const [removingId, setRemovingId]     = useState<number | null>(null);
  const [activeTab, setActiveTab]       = useState<'invite' | 'members'>('invite');
  const inputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncs prop-driven member list into local state for optimistic updates.
  useEffect(() => { setMembers(existingMembers); }, [existingMembers]);

  /* eslint-disable react-hooks/set-state-in-effect -- Resets transient form state when modal opens; not a cascade risk. */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setPendingInvites([]);
      setInputValue('');
      setActiveTab('invite');
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function addEmailToQueue() {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return;
    if (!validateEmail(trimmed)) { showToast('Please enter a valid email address.', 'error'); return; }
    if (pendingInvites.some((p) => p.email === trimmed)) { showToast('Already in the invite list.', 'error'); return; }
    setPendingInvites((prev) => [
      ...prev,
      { email: trimmed, role: selectedRole, id: `${Date.now()}-${Math.random()}` },
    ]);
    setInputValue('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmailToQueue(); }
    if (e.key === 'Backspace' && !inputValue && pendingInvites.length > 0) {
      setPendingInvites((prev) => prev.slice(0, -1));
    }
  }

  function removePending(id: string) {
    setPendingInvites((prev) => prev.filter((p) => p.id !== id));
  }

  async function sendInvites() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !validateEmail(trimmed)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    let queue = [...pendingInvites];
    if (trimmed && !queue.some((p) => p.email === trimmed)) {
      queue = [...queue, { email: trimmed, role: selectedRole, id: 'final' }];
    }
    if (queue.length === 0) { showToast('Add at least one email address.', 'error'); return; }

    setSending(true);
    const results = await Promise.allSettled(
      queue.map((invite) => ProjectService.addMember(projectId, invite.email, invite.role))
    );
    setSending(false);

    const succeeded: ProjectMember[] = [];
    const failed: string[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        succeeded.push(result.value.data);
      } else {
        const reason =
          result.status === 'rejected'
            ? (result.reason as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No account found for that email.'
            : 'Failed';
        failed.push(`${queue[idx].email}: ${reason}`);
      }
    });

    if (succeeded.length > 0) {
      const updated = [...members.filter((m) => !succeeded.find((s) => s.id === m.id)), ...succeeded];
      setMembers(updated);
      onMembersChange(updated);
      setPendingInvites([]);
      setInputValue('');
      showToast(`${succeeded.length} member${succeeded.length > 1 ? 's' : ''} added successfully.`, 'success');
      if (failed.length === 0) setActiveTab('members');
    }
    if (failed.length > 0) showToast(failed[0], 'error');
  }

  const handleRemoveMember = useCallback(
    async (memberId: number) => {
      setRemovingId(memberId);
      try {
        await ProjectService.removeMember(projectId, memberId);
        const updated = members.filter((m) => m.id !== memberId);
        setMembers(updated);
        onMembersChange(updated);
        showToast('Member removed from project.', 'success');
      } catch (err) {
        showToast(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not remove member.',
          'error'
        );
      } finally {
        setRemovingId(null);
      }
    },
    [projectId, members, onMembersChange]
  );

  const ownerMember    = members.find((m) => m.role === 'OWNER');
  const nonOwnerMembers = members.filter((m) => m.role !== 'OWNER');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite people to project" size="lg">
      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-gray-100 mb-5 -mt-1">
        {(['invite', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab === 'invite' ? 'Invite' : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* ── INVITE TAB ─────────────────────────────────────────────── */}
      {activeTab === 'invite' && (
        <div className="space-y-5">
          {/* Token input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Email addresses
            </label>
            <div
              className="min-h-[52px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {pendingInvites.map((invite) => (
                <span
                  key={invite.id}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 text-xs font-medium"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-200 text-blue-800 text-[9px] font-bold">
                    {invite.email[0].toUpperCase()}
                  </span>
                  <span className="max-w-[160px] truncate">{invite.email}</span>
                  <span className="text-blue-400 text-[10px]">· {invite.role.toLowerCase()}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePending(invite.id); }}
                    className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-blue-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${invite.email}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputValue.trim()) addEmailToQueue(); }}
                placeholder={pendingInvites.length === 0 ? 'Enter email address…' : 'Add another…'}
                className="flex-1 min-w-[180px] outline-none bg-transparent text-sm placeholder:text-gray-400 py-0.5"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Press{' '}
              <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[10px]">Enter</kbd>
              {' '}or{' '}
              <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[10px]">,</kbd>
              {' '}to add multiple people
            </p>
          </div>

          {/* Role selector cards */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Access level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_META) as Role[]).map((role) => {
                const meta = ROLE_META[role];
                const isActive = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`block text-xs font-bold mb-0.5 ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                      {meta.label}
                    </span>
                    <span className="block text-[11px] leading-tight text-gray-500">{meta.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send button row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              {pendingInvites.length > 0
                ? `${pendingInvites.length} invitation${pendingInvites.length > 1 ? 's' : ''} queued`
                : 'No invitations queued yet'}
            </span>
            <button
              type="button"
              id="invite-send-btn"
              onClick={sendInvites}
              disabled={sending || (pendingInvites.length === 0 && !inputValue.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {sending ? 'Sending…' : 'Send invitations'}
            </button>
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div>
          <div className="space-y-0.5">
            {ownerMember && (
              <MemberRow member={ownerMember} isOwner removing={false} onRemove={() => {}} />
            )}
            {nonOwnerMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={false}
                removing={removingId === member.id}
                onRemove={() => handleRemoveMember(member.id)}
              />
            ))}
            {members.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">No members yet.</p>
            )}
          </div>
          <div className="pt-3 border-t border-gray-100 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('invite')}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                +
              </span>
              Invite more people
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
