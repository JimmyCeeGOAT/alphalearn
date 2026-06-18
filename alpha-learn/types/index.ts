export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  streak_days: number;
  last_active: string | null;
  created_at: string;
}

export interface SubjectMark {
  id: string;
  user_id: string;
  subject: string;
  percentage: number;
  aps_points: number;
}

export interface Subject {
  id: string;
  slug: string;
  label: string;
  color_hex: string;
  bg_hex: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  slug: string;
  chapter: string;
  concept_name: string;
  concept_description: string | null;
  caps_weight: number;
  youtube_id: string | null;
  notes_markdown: string | null;
  sort_order: number;
  subject?: Subject;
  mastery_score?: number; // joined from topic_progress
}

export interface MarkingStep {
  step: string;
  marks: number;
}

export interface Question {
  id: string;
  topic_id: string;
  body: string;
  difficulty: 'easy' | 'medium' | 'hard';
  total_marks: number;
  correct_answer: string;
  keywords: string[];
  marking_guide: MarkingStep[];
  topic?: Topic;
}

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_id: string;
  mastery_score: number;
  video_watched: boolean;
  updated_at: string;
}

export interface PracticeAttempt {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  marks_awarded: number;
  marks_available: number;
  xp_earned: number;
  ai_feedback: AIFeedback | null;
  created_at: string;
}

export interface AIFeedback {
  marks_awarded: number;
  marks_available: number;
  percentage: number;
  steps: FeedbackStep[];
  overall_feedback: string;
}

export interface FeedbackStep {
  step: string;
  marks: number;
  awarded: number;
  status: 'correct' | 'partial' | 'wrong';
  comment?: string;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  xp: number;
  streak_days: number;
  rank?: number;
}

export interface University {
  id: string;
  name: string;
  abbr: string;
  closing: string;
  fee: string;
  minAps: number;
  tag: string;
  color: string;
  link: string;
}
