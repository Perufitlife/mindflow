import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function OutputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    summary?: string;
    mood?: string;
    insights?: string;
    actions?: string;
    audioUri?: string;
  }>();

  const summary = params.summary ?? '';
  const mood = params.mood ?? '';
  const insights: string[] = params.insights
    ? JSON.parse(params.insights as string)
    : [];
  const actions: string[] = params.actions
    ? JSON.parse(params.actions as string)
    : [];

  const handleNewSession = () => {
    router.replace('/record');
  };

  const handleContinueToPaywall = () => {
    router.replace({
      pathname: '/paywall',
      params: {
        summary,
        mood,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Session summary</Text>
        {mood ? <Text style={styles.moodTag}>{mood}</Text> : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Summary</Text>
          <Text style={styles.sectionText}>
            {summary || 'We summarized your thoughts into a clear overview.'}
          </Text>
        </View>

        {insights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Insights</Text>
            {insights.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {actions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Next actions</Text>
            {actions.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinueToPaywall}
        >
          <Text style={styles.primaryButtonText}>Keep this going</Text>
          <Text style={styles.primaryButtonSub}>
            Unlock unlimited sessions & weekly insights
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleNewSession}>
          <Text style={styles.secondaryButtonText}>Start a new entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  moodTag: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 6,
    color: '#6B7280',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 14,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonSub: {
    color: '#D1D5DB',
    fontSize: 13,
    marginTop: 2,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});
