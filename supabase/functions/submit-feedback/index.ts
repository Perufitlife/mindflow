// supabase/functions/submit-feedback/index.ts
// Deploy with: supabase functions deploy submit-feedback --no-verify-jwt
// Secrets required: RESEND_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Destination email for feedback
const FEEDBACK_TO_EMAIL = 'support@unbindapp.com';

// Helper to format feedback type label
function getFeedbackTypeLabel(type: string): { emoji: string; label: string; color: string } {
  const labels: Record<string, { emoji: string; label: string; color: string }> = {
    bug: { emoji: '🐛', label: 'Bug Report', color: '#EF4444' },
    feature: { emoji: '💡', label: 'Feature Request', color: '#F59E0B' },
    general: { emoji: '💬', label: 'General Feedback', color: '#6366F1' },
  };
  return labels[type] || { emoji: '📝', label: 'Feedback', color: '#6366F1' };
}

// Helper to format email HTML
function formatEmailHTML(
  type: string,
  message: string,
  userEmail: string | null,
  userId: string | null
): string {
  const typeInfo = getFeedbackTypeLabel(type);
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  // Escape HTML in message
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 30px;
    }
    .type-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .type-bug {
      background-color: #FEE2E2;
      color: #991B1B;
    }
    .type-feature {
      background-color: #FEF3C7;
      color: #92400E;
    }
    .type-general {
      background-color: #E0E7FF;
      color: #3730A3;
    }
    .message-box {
      background-color: #F9FAFB;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6366F1;
      margin: 20px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .meta {
      background-color: #F3F4F6;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 14px;
      color: #6B7280;
    }
    .meta-item {
      margin: 8px 0;
    }
    .meta-label {
      font-weight: 600;
      color: #374151;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9CA3AF;
      font-size: 12px;
      background-color: #F9FAFB;
      border-top: 1px solid #E5E7EB;
    }
    h2 {
      margin-top: 0;
      color: #111827;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Feedback from Unbind App</h1>
    </div>
    <div class="content">
      <div class="type-badge type-${type}">
        ${typeInfo.emoji} ${typeInfo.label}
      </div>
      
      <h2>Message:</h2>
      <div class="message-box">${escapedMessage}</div>
      
      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">User Email:</span> ${userEmail || 'Not provided'}
        </div>
        <div class="meta-item">
          <span class="meta-label">User ID:</span> ${userId || 'Anonymous'}
        </div>
        <div class="meta-item">
          <span class="meta-label">Submitted:</span> ${timestamp} UTC
        </div>
        <div class="meta-item">
          <span class="meta-label">App Version:</span> Unbind Mobile App
        </div>
      </div>
    </div>
    <div class="footer">
      This feedback was submitted through the Unbind app feedback form.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Send email using Resend API (works in Edge Functions)
async function sendEmailViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  replyTo?: string | null
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from,
      to: [to],
      reply_to: replyTo || undefined,
      subject: subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend API error:', response.status, errorText);
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully via Resend:', result.id);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { type, message, email } = await req.json();

    // Validate input
    if (!type || !message) {
      return new Response(
        JSON.stringify({ error: 'Type and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['bug', 'feature', 'general'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid feedback type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID if authenticated (optional)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (authError) {
        console.error('Auth error (non-fatal):', authError);
        // Continue without user ID
      }
    }

    // Get Resend API key from secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY secret');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format email
    const typeInfo = getFeedbackTypeLabel(type);
    const subject = `[Unbind Feedback] ${typeInfo.emoji} ${typeInfo.label}`;
    const htmlBody = formatEmailHTML(type, message.trim(), email?.trim() || null, userId);

    // Use verified domain unbindapp.com
    const fromEmail = 'Unbind Feedback <feedback@unbindapp.com>';

    // Send email via Resend API
    await sendEmailViaResend(
      resendApiKey,
      fromEmail,
      FEEDBACK_TO_EMAIL,
      subject,
      htmlBody,
      email?.trim() || null // Set reply-to if user provided email
    );

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
