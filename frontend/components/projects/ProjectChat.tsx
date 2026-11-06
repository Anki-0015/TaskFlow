'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
  const messageInput = useRef<HTMLTextAreaElement>(null);

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
      if (messageInput.current) messageInput.current.style.height = '48px';
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="flex min-h-[440px] flex-col overflow-hidden">
      <div className="chat-header flex shrink-0 items-center gap-3 border-b px-5 py-4 sm:px-6">
        <span className="chat-empty-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.6-.9L4 20l1.9-4.1A7.5 7.5 0 1 1 20 11.5Z" />
            <path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900">{projectName} group chat</h3>
          <p className="mt-1 text-xs text-gray-500">A shared space for everyone on this project.</p>
        </div>
      </div>

      <div className="chat-scroll flex h-[min(55vh,480px)] min-h-[260px] flex-none flex-col overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-live="polite" aria-label="Project group chat messages">
        <div className="mt-auto w-full space-y-3">
          {loading ? (
            <p className="py-16 text-center text-sm text-gray-400">Loading conversation…</p>
          ) : error && messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-red-500">{error}</p>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center">
              <span className="chat-empty-icon mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.6-.9L4 20l1.9-4.1A7.5 7.5 0 1 1 20 11.5Z" />
                  <path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" />
                </svg>
              </span>
              <p className="text-sm font-medium text-gray-700">Start the project discussion</p>
              <p className="mt-1 text-xs text-gray-400">Messages here are shared with the project team.</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMine = message.user_id === user?.id;
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${isMine ? 'chat-bubble-mine text-white' : 'chat-bubble-other text-gray-900'}`}>
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
        </div>
        <div ref={messageListEnd} />
      </div>

      <form onSubmit={handleSubmit} className="chat-composer shrink-0 border-t px-4 py-4 sm:px-6">
        <label htmlFor="project-chat-message" className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-gray-500">Message</label>
        <div className="flex items-stretch gap-3">
          <textarea
            id="project-chat-message"
            ref={messageInput}
            rows={1}
            placeholder={`Message the ${projectName} team…`}
            value={draft}
            maxLength={2000}
            onChange={(event) => {
              const textarea = event.currentTarget;
              setDraft(textarea.value);
              textarea.style.height = 'auto';
              textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="field-control min-h-12 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border px-3.5 py-3 text-sm placeholder:text-gray-400 focus:outline-none transition-colors duration-150"
          />
          <Button type="submit" className="min-h-12 shrink-0 self-stretch whitespace-nowrap px-5" loading={sending} disabled={!draft.trim() || sending}>
            Send message
          </Button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
          <span>Enter to send · Shift+Enter for a new line</span>
          <span>{draft.length}/2000</span>
        </div>
        {error && messages.length > 0 && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </form>
    </Card>
  );
}
