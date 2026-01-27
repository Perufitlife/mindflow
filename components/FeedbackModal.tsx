// components/FeedbackModal.tsx - In-app Feedback System
// Arthur: "Users asked for features through email - make it easier in-app"

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/brand';
import { useTheme } from '../contexts/ThemeContext';
import posthog from '../posthog';
import { getCurrentSession } from '../services/auth';
import { SUPABASE_URL } from '../config/supabase';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature' | 'general';

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: string; color: string }[] = [
  { id: 'bug', label: 'Report Bug', icon: 'bug', color: '#EF4444' },
  { id: 'feature', label: 'Feature Request', icon: 'bulb', color: '#F59E0B' },
  { id: 'general', label: 'General Feedback', icon: 'chatbubble', color: '#6366F1' },
];

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { colors, isDark } = useTheme();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get session for auth (optional - allows anonymous feedback)
      const session = await getCurrentSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Call Edge Function to send email via Zoho SMTP
      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          email: email.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      // Track feedback in PostHog (keep existing analytics)
      posthog.capture('feedback_submitted', {
        type: feedbackType,
        message_length: message.length,
        has_email: email.length > 0,
      });

      Alert.alert(
        'Thank you! 🙏',
        'Your feedback has been received. We read every message and it helps us improve Unbind.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert(
        'Error',
        error instanceof Error && error.message
          ? `Failed to submit feedback: ${error.message}`
          : 'Failed to submit feedback. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setEmail('');
    setFeedbackType('general');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Send Feedback</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Feedback Type Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            What type of feedback?
          </Text>
          <View style={styles.typeContainer}>
            {FEEDBACK_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: feedbackType === type.id 
                      ? `${type.color}15` 
                      : colors.backgroundSecondary,
                    borderColor: feedbackType === type.id ? type.color : colors.border,
                  },
                ]}
                onPress={() => setFeedbackType(type.id)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={feedbackType === type.id ? type.color : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    { color: feedbackType === type.id ? type.color : colors.textSecondary },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message Input */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Your feedback
          </Text>
          <TextInput
            style={[
              styles.messageInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={
              feedbackType === 'bug'
                ? 'Describe the bug and steps to reproduce it...'
                : feedbackType === 'feature'
                ? 'Describe the feature you would like...'
                : 'Share your thoughts with us...'
            }
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
          />

          {/* Email (Optional) */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Email (optional)
          </Text>
          <TextInput
            style={[
              styles.emailInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="If you want us to follow up..."
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { opacity: isSubmitting ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Text>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    height: 120,
    marginBottom: 16,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
