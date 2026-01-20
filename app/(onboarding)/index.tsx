// app/(onboarding)/index.tsx - Redirect to problem screen (first step)
import { Redirect } from 'expo-router';

export default function OnboardingIndex() {
  // Start onboarding with the Problem screen (storytelling)
  return <Redirect href="/(onboarding)/problem" />;
}
