import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { AIFeedback } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { questionId, answerText } = await req.json();
    if (!questionId || !answerText?.trim()) {
      return NextResponse.json({ error: 'questionId and answerText are required' }, { status: 400 });
    }

    // Fetch question with topic
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('*, topics(concept_name, subject_id, subjects(label))')
      .eq('id', questionId)
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Build grading prompt
    const markingGuideText = question.marking_guide
      .map((s: { step: string; marks: number }, i: number) => `  Step ${i + 1} (${s.marks} mark${s.marks > 1 ? 's' : ''}): ${s.step}`)
      .join('\n');

    const systemPrompt = `You are a South African Matric examiner marking student answers fairly and accurately.
You must respond ONLY with a valid JSON object — no prose, no markdown fences, no explanation outside the JSON.

JSON schema:
{
  "marks_awarded": <integer>,
  "marks_available": <integer>,
  "percentage": <integer 0-100>,
  "steps": [
    {
      "step": "<step description>",
      "marks": <marks available for step>,
      "awarded": <marks awarded 0..marks>,
      "status": "correct" | "partial" | "wrong",
      "comment": "<optional brief comment>"
    }
  ],
  "overall_feedback": "<2-3 sentences: what was good, what to improve>"
}`;

    const userPrompt = `Subject: ${question.topics?.subjects?.label ?? 'Unknown'}
Topic: ${question.topics?.concept_name ?? 'Unknown'}

QUESTION (${question.total_marks} marks):
${question.body}

MODEL ANSWER: ${question.correct_answer}

MARKING GUIDE:
${markingGuideText}

STUDENT ANSWER:
${answerText}

Grade the student's answer step by step against the marking guide.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    let feedback: AIFeedback;

    try {
      feedback = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Clamp values
    feedback.marks_awarded = Math.min(feedback.marks_awarded, question.total_marks);
    feedback.percentage = Math.round((feedback.marks_awarded / question.total_marks) * 100);

    // XP: 10 base + percentage bonus
    const xpEarned = 10 + Math.round(feedback.percentage / 10);

    // Save attempt
    const { data: attempt, error: aErr } = await supabase
      .from('practice_attempts')
      .insert({
        user_id: user.id,
        question_id: questionId,
        answer_text: answerText,
        marks_awarded: feedback.marks_awarded,
        marks_available: question.total_marks,
        xp_earned: xpEarned,
        ai_feedback: feedback,
      })
      .select()
      .single();

    if (aErr) {
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
    }

    // Award XP to profile
    await supabase.rpc('increment_xp', { user_id: user.id, amount: xpEarned });

    // Update topic mastery (weighted average of last 5 attempts for this topic)
    const { data: recentAttempts } = await supabase
      .from('practice_attempts')
      .select('marks_awarded, marks_available')
      .eq('user_id', user.id)
      .in('question_id', [questionId])   // simplified; full impl would join via topic
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentAttempts?.length) {
      const masteryScore = Math.round(
        recentAttempts.reduce((sum, a) => sum + (a.marks_awarded / a.marks_available) * 100, 0) /
          recentAttempts.length
      );
      await supabase
        .from('topic_progress')
        .upsert(
          { user_id: user.id, topic_id: question.topic_id, mastery_score: masteryScore, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,topic_id' }
        );
    }

    return NextResponse.json({ attempt, feedback, xpEarned });
  } catch (err) {
    console.error('[grade] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
