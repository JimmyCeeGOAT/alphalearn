import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch subjects with topics and user's mastery scores
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      *,
      topics (
        id, slug, chapter, concept_name, caps_weight, sort_order,
        topic_progress (mastery_score, video_watched)
      )
    `)
    .order('label');

  // Fetch subject marks for APS calculator
  const { data: subjectMarks } = await supabase
    .from('subject_marks')
    .select('*')
    .eq('user_id', user.id);

  // Fetch recent practice attempts (last 5)
  const { data: recentAttempts } = await supabase
    .from('practice_attempts')
    .select(`
      *,
      questions (body, total_marks, topic_id,
        topics (concept_name, subject_id,
          subjects (label, color_hex)
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch leaderboard (top 10 by XP)
  const { data: leaderboard } = await supabase
    .from('profiles')
    .select('id, display_name, xp, streak_days')
    .order('xp', { ascending: false })
    .limit(10);

  return (
    <DashboardClient
      profile={profile}
      subjects={subjects ?? []}
      subjectMarks={subjectMarks ?? []}
      recentAttempts={recentAttempts ?? []}
      leaderboard={leaderboard ?? []}
    />
  );
}
