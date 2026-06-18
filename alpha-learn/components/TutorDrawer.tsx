'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TutorMessage } from '@/types';

export function TutorDrawer() {
  const { tutorOpen, tutorTopicId, tutorHistory, addTutorMessage, closeTutor } = useAppStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorHistory, streaming]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || !tutorTopicId) return;

    const userMsg: TutorMessage = { role: 'user', content: input.trim() };
    addTutorMessage(userMsg);
    setInput('');
    setStreaming(true);

    const allMessages = [...tutorHistory, userMsg];

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: tutorTopicId, messages: allMessages }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Add placeholder assistant message
      addTutorMessage({ role: 'assistant', content: '' });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        // Update last message in place via Zustand
        useAppStore.setState((s) => {
          const history = [...s.tutorHistory];
          history[history.length - 1] = { role: 'assistant', content: accumulated };
          return { tutorHistory: history };
        });
      }
    } catch {
      addTutorMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
    } finally {
      setStreaming(false);
    }
  }

  if (!tutorOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-md border-l border-slate-800 bg-slate-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">AI Tutor</p>
          <p className="font-semibold text-slate-100">Ask Alpha anything</p>
        </div>
        <button onClick={closeTutor} className="btn-ghost px-2 py-1 text-slate-400">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {tutorHistory.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">🎓</div>
            <p className="text-slate-400 text-sm">Hi, I'm Alpha! Ask me anything about this topic.</p>
          </div>
        )}
        {tutorHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-500/20 text-emerald-100 rounded-br-sm'
                  : 'bg-slate-800 text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.content || (
                <span className="flex gap-1 items-center text-slate-500">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.1s]">·</span>
                  <span className="animate-bounce [animation-delay:0.2s]">·</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-4 border-t border-slate-800 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          autoFocus
        />
        <button type="submit" disabled={streaming || !input.trim()} className="btn-primary px-3">
          →
        </button>
      </form>
    </div>
  );
}
