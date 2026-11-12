import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { GlassInput } from '../components/common/GlassInput';
import { GlassButton } from '../components/common/GlassButton';
import { GlassCard } from '../components/common/GlassCard';
import { GoogleLogo } from '../components/common/GoogleLogo';

interface AuthScreenProps {
  navigation: any;
  route?: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  );
  const { colors, isDark } = useTheme();

  const initialTab =
    route?.params?.initialTab === 'register' ? 'register' : 'login';
  const prefillEmail = route?.params?.prefillEmail || '';
  const prefillName = route?.params?.prefillName || '';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    login,
    loginWithGoogle,
    register,
    enterAsGuest,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const isEmailValid = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleAuthSubmit = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please fill in your email and password.');
      return;
    }

    if (!isEmailValid(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (activeTab === 'login') {
      const ok = await login(email.trim(), password);
      if (ok) {
        const user = useAuthStore.getState().user;
        const hasAccepted = Boolean(
          user?.terms_accepted_at || (user as any)?.termsAcceptedAt,
        );
        const hasAck = Boolean(
          user?.age_notice_ack || (user as any)?.ageNoticeAck,
        );

        if (!hasAccepted || !hasAck) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Terms' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      }
    } else {
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
        setLocalError('Please enter a valid 10-digit emergency phone number.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }

      const ok = await register(
        name.trim(),
        email.trim(),
        phone.trim(),
        password,
      );
      if (ok) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Terms' }],
        });
      }
    }
  };

  const handleGoogleAuth = async () => {
    setLocalError(null);
    clearError();
    const ok = await loginWithGoogle();
    if (ok) {
      const user = useAuthStore.getState().user;
      const hasAccepted = Boolean(
        user?.terms_accepted_at || (user as any)?.termsAcceptedAt,
      );
      const hasAck = Boolean(
        user?.age_notice_ack || (user as any)?.ageNoticeAck,
      );

      if (!hasAccepted || !hasAck) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Terms' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    }
  };

  const handleEnterOfflineShield = async () => {
    await enterAsGuest();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('AccountSelect')}
          activeOpacity={0.7}
        >
          <Feather
            name="arrow-left"
            size={16}
            color={isDark ? '#C3C1FF' : colors.primaryDark}
          />
          <Text
            style={[
              styles.backText,
              { color: isDark ? '#C3C1FF' : colors.primaryDark },
            ]}
          >
            Profiles
          </Text>
        </TouchableOpacity>

        <View style={styles.secureBadge}>
          <Text style={styles.secureBadgeText}>SECURE CITIZEN ACCESS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Screen Title & Subtitle */}
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {activeTab === 'login' ? 'Welcome back' : 'Create account'}
        </Text>
        <Text
          style={[
            styles.screenSubtitle,
            { color: isDark ? '#A3A7C8' : colors.textSecondary },
          ]}
        >
          {activeTab === 'login'
            ? 'Sign in to see your radar and contacts'
            : 'Join the community safety network'}
        </Text>

        {/* Segmented Control Pill */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark ? 'rgba(20, 24, 44, 0.72)' : '#ECE9FA',
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === 'login' && [
                styles.segmentItemActive,
                { backgroundColor: colors.primaryDark },
              ],
            ]}
            onPress={() => {
              setActiveTab('login');
              setLocalError(null);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === 'login'
                      ? '#FFFFFF'
                      : isDark
                        ? '#A3A7C8'
                        : colors.textSecondary,
                  fontWeight: activeTab === 'login' ? '800' : '600',
                },
              ]}
            >
              Sign in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeTab === 'register' && [
                styles.segmentItemActive,
                { backgroundColor: colors.primaryDark },
              ],
            ]}
            onPress={() => {
              setActiveTab('register');
              setLocalError(null);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === 'register'
                      ? '#FFFFFF'
                      : isDark
                        ? '#A3A7C8'
                        : colors.textSecondary,
                  fontWeight: activeTab === 'register' ? '800' : '600',
                },
              ]}
            >
              Create account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Feedback */}
        {(localError || error) && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#FF8FA0" />
            <Text style={styles.errorBannerText}>{localError || error}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {activeTab === 'register' && (
            <GlassInput
              label="Full name"
              placeholder="e.g. Aditi Sharma"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon={
                <Feather
                  name="user"
                  size={18}
                  color={isDark ? '#8387AB' : '#94A3B8'}
                />
              }
            />
          )}

          <GlassInput
            label="Email address"
            placeholder={
              activeTab === 'login'
                ? 'e.g. aditi@example.com'
                : 'e.g. aditi@gmail.com'
            }
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={
              <Feather
                name="mail"
                size={18}
                color={isDark ? '#8387AB' : '#94A3B8'}
              />
            }
          />

          {activeTab === 'register' && (
            <GlassInput
              label="Emergency phone number"
              placeholder="10-digit mobile"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              hint="Used only to alert you and verify your account."
              leftIcon={
                <Feather
                  name="phone"
                  size={18}
                  color={isDark ? '#8387AB' : '#94A3B8'}
                />
              }
            />
          )}

          <GlassInput
            label="Password"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={
              <Feather
                name="lock"
                size={18}
                color={isDark ? '#8387AB' : '#94A3B8'}
              />
            }
          />

          {activeTab === 'login' && (
            <TouchableOpacity
              style={styles.forgotPasswordRow}
              onPress={() =>
                Alert.alert(
                  'Password Assistance',
                  'If you forgot your password, please contact support@safora.app or use Google Sign-in to access your account.',
                )
              }
            >
              <Text
                style={[
                  styles.forgotText,
                  { color: isDark ? '#B4B2FF' : colors.primary },
                ]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Primary Submit Button */}
          <GlassButton
            title={activeTab === 'login' ? 'Sign in →' : 'Create account →'}
            variant="primary"
            size="lg"
            loading={isLoading}
            onPress={handleAuthSubmit}
            style={styles.submitBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
            <Text
              style={[
                styles.dividerText,
                { color: isDark ? '#8387AB' : colors.textMuted },
              ]}
            >
              OR CONTINUE WITH
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Google Sign-in */}
          <GlassButton
            title={
              activeTab === 'login'
                ? 'Continue with Google'
                : 'Sign up with Google'
            }
            variant="secondary"
            size="lg"
            leftIcon={<GoogleLogo size={20} />}
            onPress={handleGoogleAuth}
            style={styles.googleBtn}
          />

          {/* Offline Safety Shield Entry (Screen 8) */}
          {activeTab === 'login' ? (
            <GlassCard
              variant="card"
              style={styles.offlineShieldCard}
              onPress={handleEnterOfflineShield}
            >
              <View style={styles.offlineCardRow}>
                <Feather
                  name="shield"
                  size={18}
                  color={isDark ? '#C3C1FF' : colors.primary}
                />
                <Text
                  style={[
                    styles.offlineShieldText,
                    { color: isDark ? '#C3C1FF' : colors.primaryDark },
                  ]}
                >
                  Low or no internet? Continue with Offline Safety Shield →
                </Text>
              </View>
            </GlassCard>
          ) : (
            <Text
              style={[
                styles.termsNoticeText,
                { color: isDark ? '#8387AB' : colors.textMuted },
              ]}
            >
              By continuing you agree to the Safety Terms and Privacy Policy.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secureBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  secureBadgeText: {
    color: '#7BE8BC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentItemActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
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
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#FF8FA0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formContainer: {
    width: '100%',
  },
  forgotPasswordRow: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 6,
    marginBottom: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    letterSpacing: 0.8,
  },
  googleBtn: {
    marginBottom: 16,
  },
  offlineShieldCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  offlineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineShieldText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  termsNoticeText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
});
