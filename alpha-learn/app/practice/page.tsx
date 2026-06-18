'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Question, AIFeedback } from '@/types';
import { useAppStore } from '@/store/useAppStore';

// ── Feedback display ────────────────────────────────────────────────────────

function FeedbackPanel({ feedback, xp }: { feedback: AIFeedback; xp: number }) {
  const statusColor = {
    correct: 'text-emerald-300',
    partial: 'text-amber-300',
    wrong: 'text-red-300',
  } as const;

  const statusIcon = { correct: '✓', partial: '~', wrong: '✗' } as const;

  return (
    <div className="card space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Your score</p>
          <p className="text-3xl font-bold text-gradient">
            {feedback.marks_awarded}/{feedback.marks_available}
            <span className="text-base text-slate-400 ml-2">({feedback.percentage}%)</span>
          </p>
        </div>
        <div className="xp-pill text-base px-3 py-1">+{xp} XP</div>
      </div>

      {/* Step breakdown */}
      <div className="space-y-2">
        {feedback.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
            <span className={`text-sm font-bold mt-0.5 w-4 text-center flex-shrink-0 ${statusColor[step.status]}`}>
              {statusIcon[step.status]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200">{step.step}</p>
              {step.comment && <p className="text-xs text-slate-400 mt-0.5">{step.comment}</p>}
            </div>
            <span className={`text-xs font-semibold flex-shrink-0 ${statusColor[step.status]}`}>
              {step.awarded}/{step.marks}
            </span>
          </div>
        ))}
      </div>

      {/* Overall feedback */}
      <div className="bg-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Tutor feedback</p>
        <p className="text-sm text-slate-200 leading-relaxed">{feedback.overall_feedback}</p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function PracticePage() {
  const supabase = createClient();
  const addXp = useAppStore((s) => s.addXp);

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setAnswer('');

    let query = supabase
      .from('questions')
      .select('*, topics(concept_name, chapter, subject_id, subjects(label, color_hex))')
      .order('id');  // randomised via TABLESAMPLE would be ideal; here we limit

    if (difficulty !== 'all') query = query.eq('difficulty', difficulty);

    const { data } = await query.limit(50);
    if (data?.length) {
      const pick = data[Math.floor(Math.random() * data.length)];
      setQuestion(pick as Question);
    }
    setLoading(false);
  }, [difficulty]);

  useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

  async function handleSubmit() {
    if (!question || !answer.trim()) return;
    setSubmitting(true);

    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, answerText: answer }),
    });

    if (res.ok) {
      const { feedback, xpEarned } = await res.json();
      setFeedback(feedback);
      setXpEarned(xpEarned);
      addXp(xpEarned);
    }
    setSubmitting(false);
  }

  const diffChip = {
    easy: 'chip-easy',
    medium: 'chip-medium',
    hard: 'chip-hard',
  } as const;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="font-bold text-emerald-400 tracking-tight">α learn</a>
          <span className="text-sm text-slate-400">Practice Mode</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Difficulty:</span>
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                difficulty === d
                  ? d === 'all' ? 'bg-slate-600 text-slate-100' : diffChip[d as 'easy'|'medium'|'hard'].replace('badge ', '') + ' ring-1 ring-current'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
          <button
            onClick={fetchQuestion}
            className="ml-auto btn-ghost text-xs"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Next question →'}
          </button>
        </div>

        {/* Question card */}
        {loading ? (
          <div className="card space-y-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-3/4" />
          </div>
        ) : question ? (
          <div className="card space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="badge text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: (question as any).topics?.subjects?.color_hex + '33',
                  color: (question as any).topics?.subjects?.color_hex,
                }}
              >
                {(question as any).topics?.subjects?.label ?? 'Subject'}
              </span>
              <span className="text-slate-500 text-xs">{(question as any).topics?.concept_name}</span>
              <span className={`ml-auto ${diffChip[question.difficulty]}`}>{question.difficulty}</span>
              <span className="text-xs text-slate-500">{question.total_marks} marks</span>
            </div>

            <p className="text-slate-100 leading-relaxed font-medium">{question.body}</p>
          </div>
        ) : (
          <div className="card text-center text-slate-400 py-12">No questions found. Try a different filter.</div>
        )}

        {/* Answer area — only show if no feedback yet */}
        {question && !feedback && (
          <div className="space-y-3">
            <label className="text-xs text-slate-400 uppercase tracking-wider">Your answer</label>
            <textarea
              className="input min-h-[160px] resize-none"
              placeholder="Write your full answer here — show all working for maximum marks…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitting}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || !answer.trim()}
                className="btn-primary"
              >
                {submitting ? 'Marking…' : 'Submit for marking'}
              </button>
              <span className="text-xs text-slate-500">AI-powered marking · instant feedback</span>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <>
            <FeedbackPanel feedback={feedback} xp={xpEarned} />
            <div className="flex gap-3">
              <button onClick={fetchQuestion} className="btn-primary flex-1">
                Next question →
              </button>
              <a
                href={`/learn/${(question as any)?.topics?.subject_id}`}
                className="btn-ghost"
              >
                Review topic
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
