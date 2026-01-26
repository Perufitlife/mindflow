// config/challenge-copy.ts
// Personalized copy based on user's selected challenge
// Used in Output Preview and Paywall screens for micro-personalization

export type ChallengeType = 'overwhelmed' | 'procrastination' | 'focus' | 'anxiety';

interface ChallengeCopy {
  // Used in Output Preview before blurred content
  insight_prefix: string;
  
  // Paywall header
  paywall_title: string;
  paywall_subtitle: string;
  
  // Primary CTA (aspirational, not transactional)
  cta: string;
  
  // Benefit statement
  benefit: string;
  
  // Short tagline
  tagline: string;
}

export const CHALLENGE_COPY: Record<ChallengeType, ChallengeCopy> = {
  overwhelmed: {
    insight_prefix: "Since your mind feels overwhelmed...",
    paywall_title: "Turn mental overload into 3-5 micro-tasks",
    paywall_subtitle: "From paralysis to action in 2 minutes",
    cta: "Get Unstuck Now",
    benefit: "Untangle your thoughts daily",
    tagline: "From chaos to clarity",
  },
  procrastination: {
    insight_prefix: "Since procrastination is your main blocker...",
    paywall_title: "From paralysis to action in 2 minutes",
    paywall_subtitle: "Turn what you're avoiding into micro-tasks you'll actually complete",
    cta: "Start Taking Action",
    benefit: "Break through procrastination",
    tagline: "Action over avoidance",
  },
  focus: {
    insight_prefix: "Since focus is your challenge...",
    paywall_title: "From scattered thoughts to one clear next step",
    paywall_subtitle: "Stop overthinking, start doing - one micro-task at a time",
    cta: "Find Your Focus",
    benefit: "Stay focused on what matters",
    tagline: "One task, full attention",
  },
  anxiety: {
    insight_prefix: "Since anxiety affects your productivity...",
    paywall_title: "From anxious loops to actionable clarity",
    paywall_subtitle: "Small wins calm the anxious mind - progress over perfection",
    cta: "Find Your Calm",
    benefit: "Turn anxiety into action",
    tagline: "Calm through action",
  },
};

// Default copy for users without a selected challenge
export const DEFAULT_CHALLENGE_COPY: ChallengeCopy = {
  insight_prefix: "Based on what you shared...",
  paywall_title: "From paralysis to action in 2 minutes",
  paywall_subtitle: "Turn mental overload into 3-5 micro-tasks you can actually do",
  cta: "Get Unstuck Now",
  benefit: "Transform thoughts into action",
  tagline: "Clarity meets action",
};

// Helper function to get copy safely
export function getChallengeCopy(challenge: string | null): ChallengeCopy {
  if (challenge && challenge in CHALLENGE_COPY) {
    return CHALLENGE_COPY[challenge as ChallengeType];
  }
  return DEFAULT_CHALLENGE_COPY;
}

// Unlock CTA options for A/B testing
export const UNLOCK_CTA_OPTIONS = [
  "See Your Complete Action Plan",
  "Unlock Your Full Insight",
  "Reveal Your Path Forward",
  "View All Your Tasks",
];
