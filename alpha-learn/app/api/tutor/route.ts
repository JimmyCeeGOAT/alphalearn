import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';
import { TutorMessage } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = 'edge'; // Enable streaming on edge

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { topicId, messages }: { topicId: string; messages: TutorMessage[] } = await req.json();

    // Fetch topic context
    const { data: topic } = await supabase
      .from('topics')
      .select('*, subjects(label)')
      .eq('id', topicId)
      .single();

    const topicContext = topic
      ? `Subject: ${topic.subjects?.label}
Chapter: ${topic.chapter}
Topic: ${topic.concept_name}
${topic.concept_description ? `Description: ${topic.concept_description}` : ''}
${topic.notes_markdown ? `\nNotes:\n${topic.notes_markdown}` : ''}`
      : 'General South African Matric question';

    const systemPrompt = `You are Alpha, an expert South African Matric tutor. You help Grade 12 students master their CAPS curriculum content.

Current topic context:
${topicContext}

Guidelines:
- Be warm, encouraging, and conversational — you're a knowledgeable peer, not a textbook
- Use South African context and examples where helpful (rand, braai, local geography, etc.)
- Show working clearly for maths and science problems; use step-by-step reasoning
- Reference CAPS curriculum terminology and structures
- Keep responses focused and digestible — avoid overwhelming walls of text
- If a student is stuck, guide with Socratic questions rather than just giving answers
- Use ✓ for correct reasoning and highlight key terms in **bold**
- End responses with a brief check-in question to reinforce understanding`;

    // Stream response
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    // Return a ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[tutor] error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}
