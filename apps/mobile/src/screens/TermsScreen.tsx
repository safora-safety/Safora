import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

interface TermsScreenProps {
  navigation: any;
  route?: any;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({
  navigation,
  route: _route,
}) => {
  const { user, updateProfile, isLoading } = useAuthStore();

  // Determine if we're in a mandatory flow (no back stack) vs opened from Settings
  const canGoBack = navigation.canGoBack();

  const [ageText, setAgeText] = useState(user?.age ? String(user.age) : '');
  const [guardianAck, setGuardianAck] = useState(
    Boolean(user?.age_notice_ack || user?.ageNoticeAck),
  );
  const [termsAccepted, setTermsAccepted] = useState(
    Boolean(user?.terms_accepted_at || user?.termsAcceptedAt),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numAge = parseInt(ageText, 10);
  const isUnder18 = !isNaN(numAge) && numAge < 18 && numAge > 0;

  // Block hardware back button when Terms is mandatory (no back stack)
  // so the user cannot bypass the consent screen
  useEffect(() => {
    if (canGoBack) return; // Allow back when opened from Settings

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back behavior
      return true;
    });
    return () => handler.remove();
  }, [canGoBack]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!ageText.trim() || isNaN(numAge) || numAge < 5 || numAge > 120) {
      setErrorMsg('Please enter a valid age (e.g., 20).');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('You must agree to the Terms & Privacy terms to proceed.');
      return;
    }

    if (!guardianAck) {
      setErrorMsg('Please acknowledge the guardian notice and safety terms.');
      return;
    }

    try {
      const success = await updateProfile({
        age: numAge,
        ageNoticeAck: true,
        termsAcceptedAt: new Date().toISOString(),
      } as any);

      if (success) {
        // After successful submission, navigate away.
        // RootNavigator's needsTerms will now be false (termsAcceptedAt is set),
        // so navigating to MainTabs is safe and permanent.
        if (canGoBack) {
          navigation.goBack();
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      } else {
        setErrorMsg('Unable to save settings. Please check your connection.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Action Bar — only show Back when navigated from Settings */}
      {canGoBack && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.shieldEmoji}>🛡️</Text>
          <Text style={styles.title}>Safety Terms & Privacy</Text>
          <Text style={styles.subtitle}>
            Please review how SAFORA protects you and handles data.
          </Text>
        </View>

        {/* Plain-Language Terms Content */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>📍 What We Collect</Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Live Location:</Text> Collected only
            during active Safe Walk sessions or when you press SOS, used to
            monitor corridor safety and alert guardians.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Community Reports:</Text> Hazard
            reports, categories, and photos you choose to submit to the
            community safety radar. Public reports never expose your identity.
          </Text>
          <Text style={styles.bodyText}>
            • <Text style={styles.bold}>Emergency Audio:</Text> Optional
            30-second ambient audio captured only upon emergency SOS trigger to
            document distress.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>🎯 Why We Collect It</Text>
          <Text style={styles.bodyText}>
            To calculate route deviation warnings, dispatch alerts to your
            designated trusted contacts, and power the real-time community
            safety index.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>
            🎓 Project & Emergency Notice
          </Text>
          <Text style={styles.bodyText}>
            SAFORA is an academic / beta college project. It provides companion
            and escort assistance but is{' '}
            <Text style={styles.bold}>not a replacement for calling 112</Text>.
            In an immediate life-threatening emergency, always dial 112
            directly.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Contact / Inquiries:{' '}
            <Text style={{ color: colors.accent }}>support@safora.app</Text>
          </Text>
        </View>

        {/* Age & Guardian Section (AGE-lite) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>
            👤 Your Age & Guardian Notice
          </Text>
          <Text style={styles.label}>Please confirm your age:</Text>
          <TextInput
            style={styles.input}
            value={ageText}
            onChangeText={setAgeText}
            placeholder="e.g. 20"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            maxLength={3}
          />

          {isUnder18 && (
            <View style={styles.under18Banner}>
              <Text style={styles.under18Text}>
                ⚠️ If you're under 18, please make sure a parent or guardian
                knows you're using SAFORA.
              </Text>
            </View>
          )}

          {/* Guardian / Age Acknowledgment Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.7}
            onPress={() => setGuardianAck(!guardianAck)}
          >
            <View
              style={[styles.checkbox, guardianAck && styles.checkboxActive]}
            >
              {guardianAck && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm my age and that a guardian is informed of my use of
              SAFORA (if under 18).
            </Text>
          </TouchableOpacity>

          {/* Terms Agreement Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.7}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View
              style={[styles.checkbox, termsAccepted && styles.checkboxActive]}
            >
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Safety Terms & Privacy Policy.
            </Text>
          </TouchableOpacity>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Accept & Continue →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  skipTopBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  skipTopBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  firstTimeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  firstTimeBadgeText: {
    color: '#BAE6FD',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  shieldEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0D111D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#131A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  under18Banner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  under18Text: {
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxLabel: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
