import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

interface AuthScreenProps {
  navigation: any;
  route?: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  navigation,
  route,
}) => {
  const initialTab =
    route?.params?.initialTab === 'register' ? 'register' : 'login';
  const prefillEmail = route?.params?.prefillEmail || '';
  const prefillName = route?.params?.prefillName || '';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, register, enterAsGuest, isLoading, error, clearError } =
    useAuthStore();

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
        try {
          navigation.navigate('MainTabs');
        } catch {}
      }
    } else {
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!phone.trim() || phone.trim().length < 10) {
        setLocalError('Please enter a valid 10-digit phone number.');
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
        try {
          navigation.navigate('MainTabs');
        } catch {}
      }
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Navigation Row */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backButtonText}>← Profiles</Text>
          </TouchableOpacity>
          <View style={styles.badgeLive}>
            <View style={styles.liveDot} />
            <Text style={styles.badgeLiveText}>256-BIT ENCRYPTED</Text>
          </View>
        </View>

        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.screenSubtitle}>
            {activeTab === 'login'
              ? 'Sign in to access your emergency radar & contacts'
              : 'Join the community safety network for instant SOS'}
          </Text>
        </View>

        {/* Segmented Switch [ Sign In | Create Account ] */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'login' && styles.segmentTabActive,
            ]}
            onPress={() => {
              setActiveTab('login');
              setLocalError(null);
              clearError();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'login' && styles.segmentTextActive,
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'register' && styles.segmentTabActive,
            ]}
            onPress={() => {
              setActiveTab('register');
              setLocalError(null);
              clearError();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'register' && styles.segmentTextActive,
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Notification */}
        {displayError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {displayError}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formCard}>
          {/* Full Name (Register only) */}
          {activeTab === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Aditi Sharma"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Email Address</Text>
              {email.length > 0 && (
                <Text
                  style={[
                    styles.validationTag,
                    isEmailValid(email) ? styles.tagValid : styles.tagInvalid,
                  ]}
                >
                  {isEmailValid(email) ? '✓ Valid' : '✕ Invalid'}
                </Text>
              )}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. aditi@gmail.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Phone Number (Register only) */}
          {activeTab === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Emergency Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="10-digit mobile (e.g. 9876543210)"
                placeholderTextColor="#64748B"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          )}

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.showToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuthSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {activeTab === 'login' ? 'Sign In' : 'Create Account'} →
              </Text>
            )}
          </TouchableOpacity>

          {/* Low / No Internet Offline Emergency Entry */}
          <TouchableOpacity
            style={styles.offlineEntryBtn}
            onPress={async () => {
              await enterAsGuest();
              navigation.navigate('MainTabs');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.offlineEntryIcon}>📶</Text>
            <Text style={styles.offlineEntryText}>
              In low or no internet? Continue with Offline Safety Shield →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButtonText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  badgeLiveText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleSection: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#0E1526',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 0.2,
  },
  validationTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagValid: {
    color: '#10B981',
  },
  tagInvalid: {
    color: '#F87171',
  },
  showToggleText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#070B14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offlineEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginTop: 16,
    gap: 8,
  },
  offlineEntryIcon: {
    fontSize: 16,
  },
  offlineEntryText: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
});
