import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.replace('/record');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Voice Journal AI</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Speak. Understand. Move forward.</Text>
        <Text style={styles.subtitle}>
          Talk for a few minutes. We turn your thoughts into a clear summary,
          key insights, and simple action steps.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.cardBullet}>• Tap the circle to start recording</Text>
          <Text style={styles.cardBullet}>• Talk freely for 2–5 minutes</Text>
          <Text style={styles.cardBullet}>
            • Get a clean summary, insights, and next actions
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Start my first session</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          No account. No setup. Just talk.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'flex-start',
  },
  logo: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  card: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  cardBullet: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  footer: {
    gap: 8,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
