'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/index';
import { ProjectChatService } from '@/services/projectChat.service';
import { ProjectMessage } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface ProjectChatProps {
  projectId: number;
  projectName: string;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ProjectChat({ projectId, projectName }: ProjectChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const latestMessageId = useRef(0);
  const messageListEnd = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (afterId?: number) => {
    try {
      const response = await ProjectChatService.getMessages(projectId, afterId);
      if (response.success && response.data) {
        if (afterId !== undefined && response.data.length === 0) return;
        setMessages((current) => {
          const allMessages = afterId === undefined ? response.data! : [...current, ...response.data!];
          const uniqueMessages = Array.from(new Map(allMessages.map((message) => [message.id, message])).values())
            .sort((left, right) => left.id - right.id);
          latestMessageId.current = uniqueMessages[uniqueMessages.length - 1]?.id || 0;
          return uniqueMessages;
        });
        if (afterId === undefined) setError('');
      }
    } catch (err: unknown) {
      if (afterId === undefined) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(message || 'Could not load project chat. Please try again.');
      }
    } finally {
      if (afterId === undefined) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages(latestMessageId.current || undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    messageListEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');
    try {
      const response = await ProjectChatService.sendMessage(projectId, body);
      if (!response.success || !response.data) {
        setError(response.message || 'Could not send your message.');
        return;
      }
      setMessages((current) => {
        const next = Array.from(new Map([...current, response.data!].map((message) => [message.id, message])).values())
          .sort((left, right) => left.id - right.id);
        latestMessageId.current = Math.max(latestMessageId.current, response.data!.id);
        return next;
      });
      setDraft('');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{projectName} group chat</h3>
        <p className="mt-1 text-xs text-gray-500">Everyone with access to this project can join the discussion.</p>
      </div>

      <div className="max-h-[520px] min-h-[300px] space-y-3 overflow-y-auto px-4 py-5 sm:px-5" role="log" aria-live="polite" aria-label="Project group chat messages">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading conversation…</p>
        ) : error && messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-red-500">{error}</p>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-gray-700">Start the project discussion</p>
            <p className="mt-1 text-xs text-gray-400">Messages here are shared with the project team.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.user_id === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className={`text-xs font-semibold ${isMine ? 'text-white' : 'text-gray-800'}`}>
                      {isMine ? 'You' : message.author_name}
                    </span>
                    {!isMine && <span className="text-[11px] text-gray-500">@{message.author_username}</span>}
                    <time className={`ml-auto text-[10px] ${isMine ? 'text-blue-100' : 'text-gray-500'}`} dateTime={message.created_at}>
                      {formatMessageTime(message.created_at)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageListEnd} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Textarea
              id="project-chat-message"
              label="Message"
              placeholder={`Message the ${projectName} team…`}
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-20"
            />
            <p className="mt-1 text-right text-[11px] text-gray-400">{draft.length}/2000</p>
          </div>
          <Button type="submit" loading={sending} disabled={!draft.trim() || sending}>
            Send message
          </Button>
        </div>
        {error && messages.length > 0 && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </form>
    </Card>
  );
}
