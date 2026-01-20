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

interface JournalAnalysis {
  summary: string;
  blocker: string;
  mood: string;
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
    const { audioBase64, language = 'en' } = await req.json();

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
    console.log('Analyzing transcript...');
    const systemPrompt = `You are a productivity coach specialized in beating procrastination. Your job is to help people turn their scattered thoughts into immediate action.

Analyze the user's voice journal and extract:

1. Summary: What they're thinking about (2 sentences max)
2. Blocker: The main thing stopping them from being productive right now (1 sentence)
3. Mood: Their emotional state in one word
4. Micro-tasks: EXACTLY 3 specific tasks they can complete in 10-30 minutes each

CRITICAL RULES FOR MICRO-TASKS:
- Each task must be actionable RIGHT NOW, not later today or tomorrow
- Each task must take between 10-30 minutes (specify the duration)
- Tasks must be ULTRA-SPECIFIC: not "work on project" but "write the first paragraph of the project intro"
- Tasks must be the SMALLEST possible first step to overcome the blocker
- Focus on quick wins that build momentum
- Break down any vague task into a concrete, measurable action
- The goal is to beat procrastination with tiny, immediate actions

IMPORTANT: Respond in the SAME LANGUAGE as the user's input.

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "summary": "Brief summary of what's on their mind",
  "blocker": "The main thing blocking their productivity",
  "mood": "one word mood",
  "tasks": [
    { "id": "1", "title": "Specific 10-30 min task", "duration": 15, "completed": false },
    { "id": "2", "title": "Specific 10-30 min task", "duration": 20, "completed": false },
    { "id": "3", "title": "Specific 10-30 min task", "duration": 10, "completed": false }
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
