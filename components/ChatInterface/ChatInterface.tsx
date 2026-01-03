'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '@/lib/api/client';
import { MemoDetailModal } from '@/components/MemoDetailModal';
import type { ChatMessage, ChatSource } from '@/lib/types';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function SourceCard({ source, onClick }: { source: ChatSource; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick(source.id)}
      className="group/card relative block w-full text-left bg-[#19282e] border border-surface-lighter rounded-xl p-3 hover:border-primary/40 hover:bg-[#1f3037] transition-all overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-[3px] h-full bg-primary/0 group-hover/card:bg-primary transition-colors" />
      <div className="flex items-start justify-between w-full mb-1">
        <div className="flex items-center gap-2 text-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">메모</span>
        </div>
      </div>
      <div className="font-semibold text-white text-sm line-clamp-1">{source.title}</div>
      <div className="text-text-secondary text-xs mt-1">
        {source.category} · {formatDate(source.created_at)}
      </div>
    </button>
  );
}

function MessageBubble({ message, onSourceClick }: { message: ChatMessage; onSourceClick: (id: string) => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      )}
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 ${
          isUser
            ? 'bg-primary text-background-dark rounded-tr-sm shadow-md'
            : 'bg-surface-lighter/60 text-white border border-white/5 rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
              </svg>
              관련 메모
            </p>
            <div className="grid grid-cols-1 gap-2">
              {message.sources.map((source) => (
                <SourceCard key={source.id} source={source} onClick={onSourceClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSourceClick = useCallback((id: string) => {
    setSelectedMemoId(id);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedMemoId(null);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const question = input.trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(question);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : '오류가 발생했습니다.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center mt-12">
            <div className="size-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">메모에 대해 물어보세요</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              &ldquo;지난주 개발 아이디어가 뭐였지?&rdquo;<br />
              &ldquo;React 관련 메모 찾아줘&rdquo;
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onSourceClick={handleSourceClick} />
            ))}
            {isLoading && (
              <div className="flex items-end gap-3 justify-start">
                <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div className="bg-surface-lighter/60 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Clear button */}
      {messages.length > 0 && (
        <div className="px-4 md:px-8 pb-2">
          <button
            onClick={handleClear}
            className="text-sm text-text-secondary hover:text-white transition-colors"
          >
            대화 초기화
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent">
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-600/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-surface-lighter/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메모에 대해 질문하세요..."
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 text-white placeholder-text-secondary focus:ring-0 py-2 px-2 max-h-32 text-sm md:text-base leading-relaxed"
              disabled={isLoading}
              style={{ minHeight: '24px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-primary hover:bg-primary/90 text-background-dark transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
              </svg>
            </button>
          </form>
        </div>
        <div className="text-center mt-3">
          <p className="text-[11px] text-text-secondary/60">AI 답변은 정확하지 않을 수 있습니다. 중요한 정보는 확인해 주세요.</p>
        </div>
      </div>

      {/* Memo detail modal */}
      <MemoDetailModal
        memoId={selectedMemoId}
        onClose={handleModalClose}
      />
    </div>
  );
}
