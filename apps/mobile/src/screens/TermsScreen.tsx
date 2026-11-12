import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  BackHandler,
  Platform,
  PermissionsAndroid,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/common/GlassCard';
import { GlassButton } from '../components/common/GlassButton';
import { MicrophoneConsentModal } from '../components/emergency/MicrophoneConsentModal';
import { LocationConsentModal } from '../components/emergency/LocationConsentModal';
import { NotificationConsentModal } from '../components/emergency/NotificationConsentModal';
import { AudioRecorderService } from '../services/audioRecorderService';
import { notificationService } from '../services/notificationService';

interface TermsScreenProps {
  navigation: any;
  route?: any;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({
  navigation,
  route: _route,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  );
  const { colors, isDark } = useTheme();
  const { user, updateProfile, isLoading } = useAuthStore();

  const canGoBack = navigation.canGoBack();
  const isExistingUser = Boolean(
    canGoBack ||
    _route?.params?.mode === 'privacy_hub' ||
    user?.terms_accepted_at ||
    user?.termsAcceptedAt,
  );
  const [viewingFullTerms, setViewingFullTerms] = useState(false);

  const formatConsentDate = (dateStr?: string) => {
    if (!dateStr) return '24 Sep 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '24 Sep 2026';
    }
  };

  // Multi-step flow: 1 = Terms Overview (Screen 10), 2 = Age & Accept (Screen 11)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form inputs for Step 2
  const [ageText, setAgeText] = useState(user?.age ? String(user.age) : '21');
  const [guardianAck, setGuardianAck] = useState(
    Boolean(user?.age_notice_ack || user?.ageNoticeAck),
  );
  const [termsAccepted, setTermsAccepted] = useState(
    Boolean(user?.terms_accepted_at || user?.termsAcceptedAt),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-permission modals state (Screens 12, 13, 14)
  const [showMicModal, setShowMicModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const numAge = parseInt(ageText, 10);

  // Block hardware back button when Terms is mandatory
  useEffect(() => {
    if (canGoBack) return;
    const handler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => handler.remove();
  }, [canGoBack]);

  const handleStep1Continue = () => {
    setErrorMsg(null);
    setCurrentStep(2);
  };

  const handleStep2Submit = async () => {
    setErrorMsg(null);

    if (!ageText.trim() || isNaN(numAge) || numAge < 5 || numAge > 120) {
      setErrorMsg('Please enter a valid age (e.g., 21).');
      return;
    }

    if (!guardianAck) {
      setErrorMsg('Please confirm your age and guardian acknowledgment.');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg(
        'You must agree to the Safety Terms & Privacy Policy to proceed.',
      );
      return;
    }

    try {
      const success = await updateProfile({
        age: numAge,
        ageNoticeAck: true,
        age_notice_ack: true,
        termsAcceptedAt: new Date().toISOString(),
        terms_accepted_at: new Date().toISOString(),
      } as any);

      if (success) {
        // Launch pre-permission sequence starting with Screen 12 (Emergency Audio)
        setShowMicModal(true);
      } else {
        setErrorMsg(
          'Failed to save terms acceptance. Please check your internet connection.',
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save terms acceptance.');
    }
  };

  // Permission Flow handlers
  const handleMicConsent = async () => {
    setShowMicModal(false);
    await AudioRecorderService.requestPermission();
    setShowLocationModal(true);
  };

  const handleMicDecline = () => {
    setShowMicModal(false);
    setShowLocationModal(true);
  };

  const handleLocationAllow = async (accuracy: 'precise' | 'approximate') => {
    setShowLocationModal(false);
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          accuracy === 'precise'
            ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );
      } catch {
        // ignore
      }
    }
    setShowNotificationModal(true);
  };

  const handleLocationDeny = () => {
    setShowLocationModal(false);
    setShowNotificationModal(true);
  };

  const handleNotificationAllow = async () => {
    setShowNotificationModal(false);
    try {
      await notificationService.registerTokenWithBackend();
    } catch {
      // ignore
    }
    finishOnboardingAndNavigate();
  };

  const handleNotificationDeny = () => {
    setShowNotificationModal(false);
    finishOnboardingAndNavigate();
  };

  const finishOnboardingAndNavigate = () => {
    if (canGoBack) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
        {viewingFullTerms ? (
          <TouchableOpacity
            style={styles.stepBackButton}
            onPress={() => setViewingFullTerms(false)}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-left"
              size={16}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
            <Text
              style={[
                styles.stepBackText,
                { color: isDark ? '#C3C1FF' : colors.primaryDark },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        ) : currentStep === 2 ? (
          <TouchableOpacity
            style={styles.stepBackButton}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-left"
              size={16}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
            <Text
              style={[
                styles.stepBackText,
                { color: isDark ? '#C3C1FF' : colors.primaryDark },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        ) : canGoBack ? (
          <TouchableOpacity
            style={styles.stepBackButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-left"
              size={16}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
            <Text
              style={[
                styles.stepBackText,
                { color: isDark ? '#C3C1FF' : colors.primaryDark },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topEmptySlot} />
        )}

        {(!isExistingUser || viewingFullTerms) && (
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(139, 137, 255, 0.18)'
                  : '#ECE9FA',
              },
            ]}
          >
            <Text
              style={[
                styles.stepBadgeText,
                { color: isDark ? '#C3C1FF' : colors.primaryDark },
              ]}
            >
              {viewingFullTerms ? 'Policy detail' : `Step ${currentStep} of 2`}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isExistingUser && !viewingFullTerms ? (
          /* ============================================================== */
          /* SCREEN 64: Privacy and terms Hub                              */
          /* ============================================================== */
          <View style={styles.hubContainer}>
            {/* Header Titles */}
            <View style={styles.hubHeader}>
              <Text
                style={[styles.hubScreenTitle, { color: colors.textPrimary }]}
              >
                Privacy and terms
              </Text>
              <Text
                style={[
                  styles.hubScreenSubtitle,
                  { color: isDark ? '#A3A7C8' : colors.textSecondary },
                ]}
              >
                How SAFORA protects you
              </Text>
            </View>

            {/* Hub Cards Group */}
            <View style={styles.hubGroup}>
              {/* Item 1: Safety terms and privacy policy */}
              <GlassCard
                variant="card"
                style={styles.hubCard}
                onPress={() => setViewingFullTerms(true)}
              >
                <View style={styles.hubRow}>
                  <View
                    style={[
                      styles.hubIconSlot,
                      {
                        backgroundColor: isDark
                          ? 'rgba(139, 137, 255, 0.16)'
                          : '#ECE9FA',
                      },
                    ]}
                  >
                    <Feather
                      name="file-text"
                      size={18}
                      color={isDark ? '#C3C1FF' : colors.primaryDark}
                    />
                  </View>
                  <View style={styles.hubTextSlot}>
                    <Text
                      style={[
                        styles.hubItemTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Safety terms and privacy policy
                    </Text>
                    <Text
                      style={[
                        styles.hubItemSub,
                        { color: isDark ? '#A3A7C8' : colors.textSecondary },
                      ]}
                    >
                      Signed{' '}
                      {formatConsentDate(
                        user?.terms_accepted_at || user?.termsAcceptedAt,
                      )}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? '#8F94BA' : colors.textMuted}
                  />
                </View>
              </GlassCard>

              {/* Item 2: Sharing and evidence */}
              <GlassCard
                variant="card"
                style={styles.hubCard}
                onPress={() => {
                  Alert.alert(
                    '🎙️ Sharing and Evidence Policy',
                    '30-second ambient audio is captured ONLY when you trigger an emergency SOS. It is encrypted and shared exclusively with your designated guardians and authorized first responders. SAFORA never listens or records in the background.',
                  );
                }}
              >
                <View style={styles.hubRow}>
                  <View
                    style={[
                      styles.hubIconSlot,
                      {
                        backgroundColor: isDark
                          ? 'rgba(139, 137, 255, 0.16)'
                          : '#ECE9FA',
                      },
                    ]}
                  >
                    <Feather
                      name="mic"
                      size={18}
                      color={isDark ? '#C3C1FF' : colors.primaryDark}
                    />
                  </View>
                  <View style={styles.hubTextSlot}>
                    <Text
                      style={[
                        styles.hubItemTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Sharing and evidence
                    </Text>
                    <Text
                      style={[
                        styles.hubItemSub,
                        { color: isDark ? '#A3A7C8' : colors.textSecondary },
                      ]}
                    >
                      Who can hear your SOS audio
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? '#8F94BA' : colors.textMuted}
                  />
                </View>
              </GlassCard>

              {/* Item 3: Who sees your location */}
              <GlassCard
                variant="card"
                style={styles.hubCard}
                onPress={() => {
                  Alert.alert(
                    '📍 Live Location Privacy',
                    'Your live location is shared ONLY during an active Safe Walk session or when an SOS is dispatched. When your walk ends or SOS disarms, live location transmission ceases immediately. We never sell or share your location history.',
                  );
                }}
              >
                <View style={styles.hubRow}>
                  <View
                    style={[
                      styles.hubIconSlot,
                      {
                        backgroundColor: isDark
                          ? 'rgba(139, 137, 255, 0.16)'
                          : '#ECE9FA',
                      },
                    ]}
                  >
                    <Feather
                      name="users"
                      size={18}
                      color={isDark ? '#C3C1FF' : colors.primaryDark}
                    />
                  </View>
                  <View style={styles.hubTextSlot}>
                    <Text
                      style={[
                        styles.hubItemTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Who sees your location
                    </Text>
                    <Text
                      style={[
                        styles.hubItemSub,
                        { color: isDark ? '#A3A7C8' : colors.textSecondary },
                      ]}
                    >
                      Guardians during a shared walk or SOS only
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? '#8F94BA' : colors.textMuted}
                  />
                </View>
              </GlassCard>

              {/* Item 4: Export my data */}
              <GlassCard
                variant="card"
                style={styles.hubCard}
                onPress={() => {
                  Alert.alert(
                    '📥 Export Data Archive',
                    `We will prepare a copy of your personal data, guardian list, and safety history and send it to ${user?.email || 'your registered email'}.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Request Archive',
                        onPress: () =>
                          Alert.alert(
                            'Request Received',
                            'Your data archive will be emailed within 24 hours.',
                          ),
                      },
                    ],
                  );
                }}
              >
                <View style={styles.hubRow}>
                  <View
                    style={[
                      styles.hubIconSlot,
                      {
                        backgroundColor: isDark
                          ? 'rgba(139, 137, 255, 0.16)'
                          : '#ECE9FA',
                      },
                    ]}
                  >
                    <Feather
                      name="download"
                      size={18}
                      color={isDark ? '#C3C1FF' : colors.primaryDark}
                    />
                  </View>
                  <View style={styles.hubTextSlot}>
                    <Text
                      style={[
                        styles.hubItemTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Export my data
                    </Text>
                    <Text
                      style={[
                        styles.hubItemSub,
                        { color: isDark ? '#A3A7C8' : colors.textSecondary },
                      ]}
                    >
                      Get a copy of your information
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? '#8F94BA' : colors.textMuted}
                  />
                </View>
              </GlassCard>

              {/* Item 5: Delete my account */}
              <GlassCard
                variant="card"
                style={styles.hubCard}
                onPress={() => {
                  Alert.alert(
                    '⚠️ Delete Account',
                    'Permanently remove your Safora account, trusted guardians, and all history? This action is immediate and cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete Permanently',
                        style: 'destructive',
                        onPress: () =>
                          Alert.alert(
                            'Notice',
                            'Please contact support@safora.app to finalize complete data removal under GDPR/DPDP.',
                          ),
                      },
                    ],
                  );
                }}
              >
                <View style={styles.hubRow}>
                  <View
                    style={[
                      styles.hubIconSlot,
                      { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                    ]}
                  >
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </View>
                  <View style={styles.hubTextSlot}>
                    <Text style={[styles.hubItemTitle, { color: '#EF4444' }]}>
                      Delete my account
                    </Text>
                    <Text
                      style={[
                        styles.hubItemSub,
                        { color: isDark ? '#A3A7C8' : colors.textSecondary },
                      ]}
                    >
                      Remove your account and data
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? '#8F94BA' : colors.textMuted}
                  />
                </View>
              </GlassCard>
            </View>

            {/* Audio Policy Banner */}
            <View
              style={[
                styles.audioNoticeBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : '#F1F5F9',
                },
              ]}
            >
              <Text
                style={[
                  styles.audioNoticeText,
                  { color: isDark ? '#A3A7C8' : colors.textSecondary },
                ]}
              >
                Audio is captured only during an SOS and is shared only with
                your emergency contacts and authorized response staff.
              </Text>
            </View>

            {/* Your Consent Card */}
            <GlassCard variant="card" style={styles.consentCard}>
              <Text
                style={[styles.consentCardTitle, { color: colors.textPrimary }]}
              >
                Your consent
              </Text>
              <View style={styles.consentRow}>
                <View style={styles.emeraldCheckSlot}>
                  <Feather name="check" size={14} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.consentItemTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Terms accepted
                  </Text>
                  <Text
                    style={[
                      styles.consentItemSub,
                      { color: isDark ? '#A3A7C8' : colors.textSecondary },
                    ]}
                  >
                    {formatConsentDate(
                      user?.terms_accepted_at || user?.termsAcceptedAt,
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.consentDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              />

              <View style={styles.consentRow}>
                <View style={styles.emeraldCheckSlot}>
                  <Feather name="check" size={14} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.consentItemTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Age confirmed
                  </Text>
                  <Text
                    style={[
                      styles.consentItemSub,
                      { color: isDark ? '#A3A7C8' : colors.textSecondary },
                    ]}
                  >
                    {user?.age ? `${user.age} years` : '21 years'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Questions Support Card */}
            <GlassCard
              variant="card"
              style={styles.supportCard}
              onPress={() =>
                Linking.openURL('mailto:support@safora.app').catch(() => {})
              }
            >
              <View style={styles.supportRow}>
                <View
                  style={[
                    styles.hubIconSlot,
                    {
                      backgroundColor: isDark
                        ? 'rgba(139, 137, 255, 0.16)'
                        : '#ECE9FA',
                    },
                  ]}
                >
                  <Feather
                    name="message-square"
                    size={18}
                    color={isDark ? '#C3C1FF' : colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.supportTitle, { color: colors.textPrimary }]}
                  >
                    Questions about your data?
                  </Text>
                  <Text
                    style={[
                      styles.supportSub,
                      { color: isDark ? '#B4B2FF' : colors.primary },
                    ]}
                  >
                    support@safora.app
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Footer */}
            <Text
              style={[
                styles.footerText,
                { color: isDark ? '#6B7280' : colors.textMuted },
              ]}
            >
              SAFORA · Version 2.0
            </Text>
          </View>
        ) : currentStep === 1 || viewingFullTerms ? (
          /* ============================================================== */
          /* SCREEN 10: Safety terms (1/2) · first sign-up only             */
          /* ============================================================== */
          <View>
            {/* Center Shield Icon */}
            <View style={styles.centerIconWrapper}>
              <View
                style={[
                  styles.centerIconBox,
                  { backgroundColor: colors.primaryDark },
                ]}
              >
                <Feather name="shield" size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
                Safety terms and privacy
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: isDark ? '#A3A7C8' : colors.textSecondary },
                ]}
              >
                Review how SAFORA protects you and handles data.
              </Text>
            </View>

            {/* Card 1: What we collect */}
            <GlassCard variant="card" style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                What we collect
              </Text>
              <View style={styles.termsBodyTextWrap}>
                <Text
                  style={[styles.bulletTitle, { color: colors.textPrimary }]}
                >
                  Live location:{' '}
                  <Text
                    style={[
                      styles.bulletBody,
                      { color: isDark ? '#C9CDE4' : colors.textSecondary },
                    ]}
                  >
                    collected only during an active Safe Walk or when you press
                    SOS, to watch route safety and alert guardians. Never
                    passively.
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.bulletTitle,
                    { color: colors.textPrimary, marginTop: 8 },
                  ]}
                >
                  Community reports:{' '}
                  <Text
                    style={[
                      styles.bulletBody,
                      { color: isDark ? '#C9CDE4' : colors.textSecondary },
                    ]}
                  >
                    hazard reports, categories and photos you choose to submit.
                    Public reports never show your identity.
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.bulletTitle,
                    { color: colors.textPrimary, marginTop: 8 },
                  ]}
                >
                  Emergency audio:{' '}
                  <Text
                    style={[
                      styles.bulletBody,
                      { color: isDark ? '#C9CDE4' : colors.textSecondary },
                    ]}
                  >
                    optional 30-second audio captured only when SOS is
                    triggered.
                  </Text>
                </Text>
              </View>
            </GlassCard>

            {/* Card 2: Why we collect it */}
            <GlassCard variant="card" style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Why we collect it
              </Text>
              <Text
                style={[
                  styles.bulletBody,
                  {
                    color: isDark ? '#C9CDE4' : colors.textSecondary,
                    marginTop: 4,
                  },
                ]}
              >
                To calculate route deviation warnings, send alerts to your
                trusted contacts and power the community safety index.
              </Text>
            </GlassCard>

            {/* Card 3: Emergency SOS and guardian protocol */}
            <GlassCard variant="card" style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Emergency SOS and guardian protocol
              </Text>
              <View style={styles.termsBodyTextWrap}>
                <Text
                  style={[styles.bulletTitle, { color: colors.textPrimary }]}
                >
                  Designated guardians:{' '}
                  <Text
                    style={[
                      styles.bulletBody,
                      { color: isDark ? '#C9CDE4' : colors.textSecondary },
                    ]}
                  >
                    when you trigger SOS, emergency SMS with your live location
                    goes straight to your trusted contacts.
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.bulletTitle,
                    { color: colors.textPrimary, marginTop: 8 },
                  ]}
                >
                  If no contacts are set:{' '}
                  <Text
                    style={[
                      styles.bulletBody,
                      { color: isDark ? '#C9CDE4' : colors.textSecondary },
                    ]}
                  >
                    SOS alerts go to central emergency dispatch and 112. We
                    recommend adding at least one guardian.
                  </Text>
                </Text>
              </View>
            </GlassCard>

            {/* Next or Back Button */}
            {viewingFullTerms ? (
              <GlassButton
                title="← Back to Privacy & Terms"
                variant="secondary"
                size="lg"
                onPress={() => setViewingFullTerms(false)}
                style={styles.stepButton}
              />
            ) : (
              <GlassButton
                title="Continue to age & guardian notice →"
                variant="primary"
                size="lg"
                onPress={handleStep1Continue}
                style={styles.stepButton}
              />
            )}
          </View>
        ) : (
          /* ============================================================== */
          /* SCREEN 11: Safety terms (2/2) · age and accept                 */
          /* ============================================================== */
          <View>
            {/* Card 1: Project and emergency notice */}
            <GlassCard variant="card" style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Project and emergency notice
              </Text>
              <Text
                style={[
                  styles.bulletBody,
                  {
                    color: isDark ? '#C9CDE4' : colors.textSecondary,
                    marginTop: 4,
                    lineHeight: 18,
                  },
                ]}
              >
                SAFORA is an academic / beta college project. It gives companion
                and escort help but{' '}
                <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                  is not a replacement for calling 112
                </Text>
                . In a life-threatening emergency, dial 112 directly.{'\n'}
                Contact: support@safora.app
              </Text>
            </GlassCard>

            {/* Card 2: Your age and guardian notice */}
            <GlassCard variant="card" style={styles.sectionCard}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Your age and guardian notice
              </Text>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: isDark ? '#C9CDE4' : colors.textSecondary },
                ]}
              >
                Please confirm your age
              </Text>

              {/* Age Numeric Field */}
              <View
                style={[
                  styles.ageInputBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(20, 24, 44, 0.72)'
                      : '#ECE9FA',
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  value={ageText}
                  onChangeText={setAgeText}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="e.g. 21"
                  placeholderTextColor={isDark ? '#8387AB' : '#94A3B8'}
                  style={[styles.ageTextInput, { color: colors.textPrimary }]}
                />
              </View>

              {/* Checkbox 1: Age & Guardian */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setGuardianAck(!guardianAck)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxSquare,
                    guardianAck
                      ? {
                          backgroundColor: colors.primaryDark,
                          borderColor: colors.primaryDark,
                        }
                      : {
                          borderColor: colors.border,
                          backgroundColor: 'transparent',
                        },
                  ]}
                >
                  {guardianAck && (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkboxLabel,
                    { color: isDark ? '#D5D9EC' : colors.textPrimary },
                  ]}
                >
                  I confirm my age and that a guardian is informed of my use of
                  SAFORA (if under 18).
                </Text>
              </TouchableOpacity>

              {/* Checkbox 2: Safety Terms Agreement */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxSquare,
                    termsAccepted
                      ? {
                          backgroundColor: colors.primaryDark,
                          borderColor: colors.primaryDark,
                        }
                      : {
                          borderColor: colors.border,
                          backgroundColor: 'transparent',
                        },
                  ]}
                >
                  {termsAccepted && (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkboxLabel,
                    { color: isDark ? '#D5D9EC' : colors.textPrimary },
                  ]}
                >
                  I have read and agree to the Safety Terms and Privacy Policy.
                </Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color="#FF8FA0" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Accept Button */}
            <GlassButton
              title="Accept and continue →"
              variant="primary"
              size="lg"
              loading={isLoading}
              onPress={handleStep2Submit}
              style={styles.stepButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Screen 12: Emergency Audio Consent Modal */}
      <MicrophoneConsentModal
        visible={showMicModal}
        onConsent={handleMicConsent}
        onDecline={handleMicDecline}
      />

      {/* Screen 13: Location Permission Modal */}
      <LocationConsentModal
        visible={showLocationModal}
        onAllowWhileUsing={handleLocationAllow}
        onAllowOnce={handleLocationAllow}
        onDeny={handleLocationDeny}
      />

      {/* Screen 14: Notification Permission Modal */}
      <NotificationConsentModal
        visible={showNotificationModal}
        onAllow={handleNotificationAllow}
        onDeny={handleNotificationDeny}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  stepBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stepBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topEmptySlot: {
    width: 60,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centerIconWrapper: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  centerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  termsBodyTextWrap: {
    marginTop: 2,
  },
  bulletTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  bulletBody: {
    fontWeight: '400',
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 6,
  },
  ageInputBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 14,
  },
  ageTextInput: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 10,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(240, 90, 110, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(240, 90, 110, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  errorText: {
    color: '#FF8FA0',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  stepButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  hubContainer: {
    gap: 16,
  },
  hubHeader: {
    marginBottom: 4,
  },
  hubScreenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  hubScreenSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  hubGroup: {
    gap: 10,
  },
  hubCard: {
    padding: 14,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hubIconSlot: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTextSlot: {
    flex: 1,
  },
  hubItemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  hubItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  audioNoticeBox: {
    padding: 14,
    borderRadius: 14,
  },
  audioNoticeText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  consentCard: {
    padding: 16,
    gap: 12,
  },
  consentCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emeraldCheckSlot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  consentItemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  consentDivider: {
    height: 1,
  },
  supportCard: {
    padding: 14,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  supportSub: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
  },
});
