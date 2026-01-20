// constants/brand.ts
// Unbind Brand Configuration
// ASO Keywords: productivity, focus, procrastination, voice journal, habit tracker, task manager, micro tasks, ADHD, time management, AI

export const BRAND = {
  name: 'Unbind',
  tagline: 'Unbind your mind. Take action.',
  description: 'Voice journal to beat procrastination with AI-powered micro-tasks',
  
  // App Store / Play Store
  appStore: {
    // Title (30 char max): Primary keyword + brand
    title: 'Unbind: Beat Procrastination',
    
    // Subtitle (30 char max iOS): Secondary keywords
    subtitle: 'Voice Journal & Focus Tasks',
    
    // Keywords (100 char max iOS, comma separated, no spaces)
    keywords: 'focus,procrastination,productivity,voice journal,habit tracker,task manager,micro tasks,ADHD,time management,AI',
    
    // Short description (80 char max Android)
    shortDescription: 'Voice journal your thoughts. Get AI micro-tasks. Beat procrastination now.',
    
    // Full description for App Store (4000 char max)
    fullDescription: `Unbind is the voice-first productivity app that helps you beat procrastination instantly. Just speak your thoughts for 2-3 minutes, and our AI will analyze your blockers and give you specific micro-tasks you can complete in 10-30 minutes.

STOP PROCRASTINATING. START DOING.

Are you stuck in analysis paralysis? Overwhelmed by your to-do list? Unbind helps you break free from mental blocks and take immediate action.

HOW IT WORKS:
1. Voice Journal - Speak freely about what's on your mind
2. AI Analysis - We find what's blocking you
3. Micro-Tasks - Get 3 specific tasks you can do RIGHT NOW

FEATURES:
• Voice-first journaling - No typing required
• AI-powered task generation - Personalized micro-actions
• Focus timer - Complete tasks in 10-30 minute sessions
• Progress tracking - See your wins add up
• ADHD-friendly design - Simple, focused interface

PERFECT FOR:
• People who procrastinate
• Students struggling to focus
• Professionals with overwhelming workloads
• Anyone with ADHD or executive dysfunction
• People who want to be more productive

WHY UNBIND?
Unlike other productivity apps that give you MORE to manage, Unbind simplifies everything. Just speak and act. No complex systems, no overwhelming features.

PRIVACY FIRST:
Your voice journals are processed securely and never stored on our servers. Your thoughts remain yours.

Start your free trial today and unbind your potential!`,
  },
  
  // Social
  social: {
    twitter: '@unbindapp',
    instagram: '@unbindapp',
    website: 'https://unbindapp.com',
    support: 'support@unbindapp.com',
  },
  
  // Colors
  colors: {
    primary: '#4F46E5',      // Indigo - trust, calm, focus
    primaryLight: '#818CF8',
    primaryDark: '#3730A3',
    secondary: '#10B981',    // Emerald - action, progress, success
    secondaryLight: '#34D399',
    accent: '#F59E0B',       // Amber - energy, urgency, attention
    background: '#FAFAFA',
    backgroundDark: '#1F2937',
    text: '#111827',
    textLight: '#6B7280',
    textMuted: '#9CA3AF',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
} as const;

// Export individual constants for easy access
export const APP_NAME = BRAND.name;
export const COLORS = BRAND.colors;

// Typography System - Emotional hierarchy for better conversion
export const TYPOGRAPHY = {
  // Hero headlines - Maximum emotional impact
  emotionalHeadline: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
    color: '#111827',
  },
  
  // Section titles - Strong but not overpowering
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 32,
    color: '#111827',
  },
  
  // Emphasis text - Highlighted words within paragraphs
  emphasisText: {
    fontWeight: '700' as const,
    color: BRAND.colors.primary,
  },
  
  // Soft body text - Easy to read, doesn't compete
  softBody: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 26,
    color: '#6B7280',
  },
  
  // Card titles
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 24,
    color: '#111827',
  },
  
  // Small labels - Subtle context
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: BRAND.colors.primary,
  },
  
  // CTA buttons - Clear action
  ctaText: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  
  // Stats/Numbers - Draw attention
  statNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: '#111827',
  },
  
  // Subtle hints
  hint: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#9CA3AF',
    lineHeight: 20,
  },
} as const;
