// supabase/functions/process-journal/index.ts
// Deploy with: supabase functions deploy process-journal --no-verify-jwt
// Set secrets: supabase secrets set OPENAI_API_KEY=your_key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface MicroTask {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
}

interface UserContext {
  challenge: string;
  timeOfDay: string;
  hourContext: string;
}

interface JournalAnalysis {
  summary: string;
  blocker: string;
  mood: string;
  insight: string; // NEW: Personal coach observation
  tasks: MicroTask[];
}

// ===========================================
// BUSINESS MODEL: Trial-Only
// ===========================================
// TRIAL: 3 days, 10 sessions/day (max 30 total)
// PREMIUM: 10 sessions/day, unlimited
// 
// Cost per session: $0.014 (Whisper + GPT-4o-mini)
// Trial cost per user: ~$0.14 (avg 10 sessions)
// ===========================================

const TRIAL_DURATION_DAYS = 3;
const MAX_SESSIONS_PER_DAY = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check access: Premium OR in trial period
    const isPremium = profile.is_premium === true;
    const trialStartDate = profile.trial_start_date ? new Date(profile.trial_start_date) : null;
    const now = new Date();
    
    let isInTrial = false;
    let trialDaysRemaining = 0;
    
    if (trialStartDate && !isPremium) {
      const diffMs = now.getTime() - trialStartDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      isInTrial = diffDays < TRIAL_DURATION_DAYS;
      trialDaysRemaining = Math.max(0, TRIAL_DURATION_DAYS - diffDays);
    }

    // No access if not premium and trial expired
    if (!isPremium && !isInTrial) {
      return new Response(
        JSON.stringify({
          error: 'trial_expired',
          message: 'Your free trial has expired. Subscribe to continue.',
          trialDaysRemaining: 0,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    let sessionsToday = 0;

    if (profile.last_session_date === today) {
      sessionsToday = profile.daily_sessions_count || 0;
    }

    if (sessionsToday >= MAX_SESSIONS_PER_DAY) {
      return new Response(
        JSON.stringify({
          error: 'daily_limit_reached',
          message: `You've used all ${MAX_SESSIONS_PER_DAY} sessions for today. Come back tomorrow!`,
          sessionsToday,
          maxSessions: MAX_SESSIONS_PER_DAY,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { audioBase64, language = 'en', userContext } = await req.json();
    
    // Default user context if not provided
    const context: UserContext = userContext || {
      challenge: 'general productivity',
      timeOfDay: 'day',
      hourContext: 'during their day',
    };

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing audio data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Transcribe audio with Whisper
    console.log('Transcribing audio...');
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', language);

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper error status:', whisperResponse.status);
      console.error('Whisper error body:', errorText);
      
      // Parse error for better message
      let errorMessage = 'Transcription failed';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = `Transcription failed: ${errorJson.error.message}`;
        }
      } catch (e) {
        // Keep default message
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          whisperStatus: whisperResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text: transcript } = await whisperResponse.json();
    console.log('Transcription complete, length:', transcript.length);

    // Step 2: Analyze with GPT-4o-mini
    console.log('Analyzing transcript with context:', context);
    const systemPrompt = `You are a premium productivity coach specialized in helping people with ${context.challenge}. The user is ${context.hourContext} (${context.timeOfDay}).

Analyze their voice journal and provide PERSONALIZED guidance:

1. Summary: What they're dealing with (2 sentences, acknowledge their specific struggle with ${context.challenge})
2. Blocker: The REAL underlying blocker - dig deeper than the surface (1 sentence)
3. Mood: Their emotional state in one word
4. Insight: A coach's observation that makes them feel TRULY understood. Notice patterns, word choices, or hidden feelings. Examples:
   - "You mentioned 'should' 3 times - that pressure might be part of the problem"
   - "It sounds like you're not lacking time, you're lacking clarity on where to start"
   - "The real issue isn't the task, it's the fear of not doing it perfectly"
5. Micro-tasks: EXACTLY 3 tasks in MICRO-DECISION FORMAT with duration in title:
   - Task 1 (STARTER): 2-5 minutes, ZERO friction, can do RIGHT NOW. 
     Examples: "Write 3 bullet points about the problem (3min)", "Set timer and brainstorm next steps (5min)"
   - Task 2 (BUILDER): 10-15 minutes, builds on Task 1.
     Examples: "Draft intro paragraph for proposal (12min)", "Outline the 3 main sections (10min)"
   - Task 3 (MOMENTUM): 15-25 minutes, the "real" work but feels achievable after 1 & 2.
     Examples: "Complete first section of document (20min)", "Send email with update to team (15min)"

CRITICAL RULES FOR TASK FORMAT:
- ALWAYS include duration in parentheses at the end: "(3min)", "(10min)", "(20min)"
- Frame as SPECIFIC ACTIONS: "Send email to John about X (5min)" NOT "work on email"
- Task 1 must be SO EASY they'd feel silly not doing it (the "just get started" trigger)
- All tasks must address their specific ${context.challenge} issue
- Acknowledge their ${context.timeOfDay} energy level (morning = fresh start, evening = wind down, night = be gentle)

IMPORTANT: Respond in the SAME LANGUAGE as the user's input.

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "summary": "Personalized summary acknowledging their ${context.challenge}",
  "blocker": "The deeper, real blocker",
  "mood": "one word",
  "insight": "A powerful observation that makes them feel understood",
  "tasks": [
    { "id": "1", "title": "Write 3 bullet points about the main problem (3min)", "duration": 3, "completed": false },
    { "id": "2", "title": "Draft outline for next steps (12min)", "duration": 12, "completed": false },
    { "id": "3", "title": "Complete first section of the plan (20min)", "duration": 20, "completed": false }
  ]
}`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!gptResponse.ok) {
      const error = await gptResponse.text();
      console.error('GPT error:', error);
      return new Response(
        JSON.stringify({ error: 'Analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No analysis content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse GPT response
    let analysis: JournalAnalysis;
    try {
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Save session to database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        transcript,
        summary: analysis.summary,
        blocker: analysis.blocker,
        mood: analysis.mood,
        tasks: analysis.tasks,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session save error:', sessionError);
    }

    // Step 4: Update user stats
    const newDailyCount = profile.last_session_date === today
      ? (profile.daily_sessions_count || 0) + 1
      : 1;
    
    const newTotalSessions = (profile.total_sessions || 0) + 1;
    const newTrialSessions = isInTrial 
      ? (profile.trial_sessions_used || 0) + 1 
      : profile.trial_sessions_used;

    await supabase
      .from('profiles')
      .update({
        daily_sessions_count: newDailyCount,
        last_session_date: today,
        total_sessions: newTotalSessions,
        trial_sessions_used: newTrialSessions,
      })
      .eq('id', user.id);

    // Return result
    return new Response(
      JSON.stringify({
        transcript,
        analysis,
        sessionId: session?.id,
        sessionsToday: newDailyCount,
        maxSessions: MAX_SESSIONS_PER_DAY,
        isInTrial,
        trialDaysRemaining,
        isPremium,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
