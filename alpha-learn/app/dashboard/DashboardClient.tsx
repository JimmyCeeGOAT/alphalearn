'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Profile, Subject, SubjectMark, PracticeAttempt, LeaderboardEntry } from '@/types';
import { UNIVERSITIES, pctToAps } from '@/data/universityData';

// ── Helpers ─────────────────────────────────────────────────────────────────

function avgMastery(topics: any[]): number {
  if (!topics?.length) return 0;
  const scores = topics.flatMap((t) => t.topic_progress?.map((p: any) => p.mastery_score) ?? [0]);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function totalAps(marks: SubjectMark[]): number {
  return marks
    .filter((m) => m.subject !== 'Life Orientation')
    .slice(0, 6)
    .reduce((sum, m) => sum + m.aps_points, 0);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`card flex flex-col gap-1 ${accent ? 'border-emerald-500/30 glow-emerald' : ''}`}>
      <span className="text-xs text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold ${accent ? 'text-gradient' : 'text-slate-100'}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject & { topics: any[] } }) {
  const mastery = avgMastery(subject.topics);
  const topicsCount = subject.topics?.length ?? 0;
  const watched = subject.topics?.filter((t) => t.topic_progress?.some((p: any) => p.video_watched)).length ?? 0;

  return (
    <Link href={`/learn/${subject.slug}`} className="card group hover:border-slate-700 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: subject.color_hex + '33', color: subject.color_hex }}
        >
          {subject.label.slice(0, 2)}
        </div>
        <span className="text-xs text-slate-400">{mastery}% mastery</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100 mb-1 group-hover:text-emerald-300 transition-colors">
        {subject.label}
      </h3>
      <p className="text-xs text-slate-500 mb-3">{watched}/{topicsCount} topics watched</p>
      <div className="mastery-bar">
        <div className="mastery-fill" style={{ width: `${mastery}%` }} />
      </div>
    </Link>
  );
}

function ApsRow({ mark }: { mark: SubjectMark }) {
  const aps = mark.aps_points;
  const color = aps >= 5 ? 'text-emerald-300' : aps >= 3 ? 'text-amber-300' : 'text-red-300';
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-300">{mark.subject}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">{mark.percentage}%</span>
        <span className={`text-sm font-bold w-6 text-center ${color}`}>{aps}</span>
      </div>
    </div>
  );
}

function LeaderRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isMe ? 'bg-emerald-500/10 border border-emerald-500/20' : ''}`}>
      <span className={`text-xs font-mono w-5 text-center ${rank <= 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
        {rank}
      </span>
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0">
        {(entry.display_name ?? 'A').slice(0, 1).toUpperCase()}
      </div>
      <span className={`text-sm flex-1 truncate ${isMe ? 'text-emerald-300 font-medium' : 'text-slate-300'}`}>
        {entry.display_name ?? 'Anonymous'} {isMe && '(you)'}
      </span>
      <span className="xp-pill">{entry.xp.toLocaleString()} XP</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  profile: Profile | null;
  subjects: (Subject & { topics: any[] })[];
  subjectMarks: SubjectMark[];
  recentAttempts: (PracticeAttempt & { questions: any })[];
  leaderboard: LeaderboardEntry[];
}

export function DashboardClient({ profile, subjects, subjectMarks, recentAttempts, leaderboard }: Props) {
  const [apsTab, setApsTab] = useState<'marks' | 'unis'>('marks');

  const aps = totalAps(subjectMarks);
  const displayName = profile?.display_name ?? 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const myRank = leaderboard.findIndex((e) => e.id === profile?.id) + 1;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-emerald-400 tracking-tight">α learn</span>
          <div className="flex items-center gap-2">
            <Link href="/practice" className="btn-ghost text-xs">Practice</Link>
            <Link href="/aps" className="btn-ghost text-xs">APS</Link>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-emerald-300 ml-1">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* ── Header ── */}
        <div>
          <p className="text-slate-400 text-sm mb-1">{greeting},</p>
          <h1 className="text-2xl font-bold text-slate-100">{displayName} 👋</h1>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total XP" value={profile?.xp?.toLocaleString() ?? 0} sub={myRank ? `Rank #${myRank}` : undefined} accent />
          <StatCard label="Streak" value={`${profile?.streak_days ?? 0}d`} sub="days in a row" />
          <StatCard label="APS Score" value={aps} sub="out of 42" />
          <StatCard label="Subjects" value={subjects.length} sub="CAPS subjects" />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: subjects */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Your Subjects</h2>
              <Link href="/learn" className="text-xs text-emerald-400 hover:text-emerald-300">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
            </div>

            {/* Recent activity */}
            {recentAttempts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-slate-100">Recent Practice</h2>
                <div className="card space-y-0 p-0 overflow-hidden">
                  {recentAttempts.map((a) => {
                    const pct = Math.round((a.marks_awarded / a.marks_available) * 100);
                    const color = pct >= 75 ? 'text-emerald-300' : pct >= 50 ? 'text-amber-300' : 'text-red-300';
                    return (
                      <div key={a.id} className="flex items-center gap-4 px-5 py-3 border-b border-slate-800 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">
                            {a.questions?.topics?.concept_name ?? 'Question'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.questions?.topics?.subjects?.label ?? ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${color}`}>{pct}%</p>
                          <p className="text-xs text-slate-500">{a.marks_awarded}/{a.marks_available} marks</p>
                        </div>
                        <span className="xp-pill">+{a.xp_earned}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: APS + leaderboard */}
          <div className="space-y-6">

            {/* APS panel */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100">APS Calculator</h2>
                <span className="text-2xl font-bold text-gradient">{aps}</span>
              </div>

              {/* Tab toggle */}
              <div className="flex rounded-lg bg-slate-800 p-1 gap-1 text-xs">
                {(['marks', 'unis'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setApsTab(tab)}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                      apsTab === tab ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'marks' ? 'My Marks' : 'Universities'}
                  </button>
                ))}
              </div>

              {apsTab === 'marks' ? (
                <div>
                  {subjectMarks.map((m) => <ApsRow key={m.id} mark={m} />)}
                  <Link href="/aps" className="btn-ghost w-full justify-center mt-3 text-xs">
                    Edit marks
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {UNIVERSITIES.map((u) => {
                    const eligible = aps >= u.minAps;
                    return (
                      <a
                        key={u.id}
                        href={u.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${eligible ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs font-medium text-slate-200">{u.abbr}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${eligible ? 'text-emerald-300' : 'text-slate-500'}`}>
                            {eligible ? '✓ Eligible' : `Need ${u.minAps}`}
                          </p>
                          <p className="text-xs text-slate-600">{u.closing}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="card space-y-3">
              <h2 className="text-base font-semibold text-slate-100">Leaderboard</h2>
              <div className="space-y-1">
                {leaderboard.map((e, i) => (
                  <LeaderRow key={e.id} entry={e} rank={i + 1} isMe={e.id === profile?.id} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
