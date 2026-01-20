// app/(tabs)/settings.tsx - Settings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FeedbackModal from '../../components/FeedbackModal';
import ThemeSelector from '../../components/ThemeSelector';
import { useTheme } from '../../contexts/ThemeContext';
import { setGlobalLanguage, useTranslation } from '../../hooks/useTranslation';
import { Language, LANGUAGES } from '../../i18n/translations';
import { signOut, getCurrentUser } from '../../services/auth';
import {
  checkPermissions,
  enableNotifications,
  disableNotifications,
  getNotificationSettings,
} from '../../services/notifications';
import { clearAllEntries } from '../../services/storage';
import { getPreferences, resetUserState, updatePreferences } from '../../services/user';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { colors, isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const prefs = await getPreferences();
    setSelectedLanguage((prefs.language as Language) || 'en');
    
    // Load actual notification settings
    const notifSettings = await getNotificationSettings();
    const hasPermission = await checkPermissions();
    setNotificationsEnabled(notifSettings.enabled && hasPermission);
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Try to enable notifications
      const success = await enableNotifications();
      
      if (success) {
        setNotificationsEnabled(true);
        await updatePreferences({ notificationsEnabled: true });
        Alert.alert(
          'Notifications Enabled',
          'You will receive daily reminders at 9:00 AM.'
        );
      } else {
        // Permission denied - guide user to settings
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } else {
      // Disable notifications
      await disableNotifications();
      setNotificationsEnabled(false);
      await updatePreferences({ notificationsEnabled: false });
    }
  };

  const handleLanguageSelect = async (lang: Language) => {
    setSelectedLanguage(lang);
    await updatePreferences({ language: lang });
    setGlobalLanguage(lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = LANGUAGES.find((l) => l.code === selectedLanguage);
    return lang ? lang.nativeName : 'English';
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      t('settings.reset_onboarding'),
      t('settings.reset_onboarding_sub'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetUserState();
            router.replace('/(onboarding)');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.clear_data'),
      t('settings.clear_data_sub'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await clearAllEntries();
            await resetUserState();
            Alert.alert(t('common.success'), 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'This will sign you out and create a new session. Use this to fix authentication issues.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Alert.alert('Success', 'Signed out. The app will create a new session automatically.');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    iconColor = colors.textMuted,
    title,
    subtitle,
    onPress,
    rightElement,
    showArrow = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance - Theme Selector */}
        <ThemeSelector />

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.preferences')}</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="notifications-outline"
            iconColor={colors.primary}
            title={t('settings.notifications')}
            subtitle={notificationsEnabled ? 'Daily reminders at 9:00 AM' : 'Off'}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
              />
            }
            showArrow={false}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="language-outline"
            iconColor="#10B981"
            title={t('settings.language')}
            subtitle={getCurrentLanguageName()}
            onPress={() => setShowLanguageModal(true)}
          />
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.support')}</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="chatbubble-ellipses-outline"
            iconColor="#6366F1"
            title="Send Feedback"
            subtitle="Bugs, features, or just say hi"
            onPress={() => setShowFeedbackModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="help-circle-outline"
            iconColor="#F59E0B"
            title={t('settings.help')}
            onPress={() => Linking.openURL('https://unbindapp.com/support.html')}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="mail-outline"
            iconColor="#3B82F6"
            title={t('settings.contact')}
            onPress={() => Linking.openURL('mailto:support@unbindapp.com')}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="star-outline"
            iconColor="#EC4899"
            title={t('settings.rate')}
            onPress={() => Alert.alert('Thank you!', 'Rating coming soon.')}
          />
        </View>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Legal</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="document-text-outline"
            iconColor="#6B7280"
            title="Privacy Policy"
            subtitle="How we handle your data"
            onPress={() => Linking.openURL('https://unbindapp.com/privacy.html')}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor="#6B7280"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://unbindapp.com/terms.html')}
          />
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings.account')}</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="download-outline"
            iconColor="#6366F1"
            title={t('settings.export')}
            subtitle={t('settings.export_sub')}
            onPress={() => Alert.alert(t('settings.coming_soon'), 'Export feature coming soon!')}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="refresh-outline"
            iconColor="#F59E0B"
            title={t('settings.reset_onboarding')}
            subtitle={t('settings.reset_onboarding_sub')}
            onPress={handleResetOnboarding}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="trash-outline"
            iconColor="#EF4444"
            title={t('settings.clear_data')}
            subtitle={t('settings.clear_data_sub')}
            onPress={handleClearData}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <SettingRow
            icon="log-out-outline"
            iconColor="#EF4444"
            title="Sign Out"
            subtitle="Fix authentication issues"
            onPress={handleSignOut}
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: colors.text }]}>Unbind</Text>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>{t('settings.version')} 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  selectedLanguage === lang.code && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageText}>
                  <Text
                    style={[
                      styles.languageName,
                      { color: colors.text },
                      selectedLanguage === lang.code && { color: colors.primary },
                    ]}
                  >
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.languageNameSecondary, { color: colors.textMuted }]}>{lang.name}</Text>
                </View>
                {selectedLanguage === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 66,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appVersion: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  languageOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 14,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  languageNameActive: {
    color: '#4338CA',
  },
  languageNameSecondary: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
