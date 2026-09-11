import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { login, enterAsGuest, isLoading, error, clearError } = useAuthStore();

  const isEmailValid = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleLogin = async () => {
    setFormError(null);
    clearError();

    if (!email.trim() || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    if (!isEmailValid(email)) {
      setFormError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    await login(email.trim(), password);
  };

  const displayError = formError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your SAFORA safety account
          </Text>
        </View>

        {/* Error Notification Banner */}
        {displayError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{displayError}</Text>
            <TouchableOpacity
              onPress={() => {
                setFormError(null);
                clearError();
              }}
              style={styles.errorDismiss}
            >
              <Text style={styles.errorDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email Address
              </Text>
              {email.length > 0 && (
                <Text
                  style={[
                    styles.validationIndicator,
                    isEmailValid(email) ? styles.validText : styles.invalidText,
                  ]}
                >
                  {isEmailValid(email) ? '✓ Valid' : '✕ Incomplete'}
                </Text>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
                email.length > 0 && !isEmailValid(email) && styles.inputInvalid,
              ]}
              placeholder="e.g. aditi@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (formError) setFormError(null);
              }}
            />
          </View>

          {/* Password with Eye/Eye-Off toggle */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password
              </Text>
              {password.length > 0 && password.length < 6 && (
                <Text style={styles.invalidText}>Min 6 characters</Text>
              )}
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (formError) setFormError(null);
                }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(prev => !prev)}
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!email || !password || isLoading) && styles.submitButtonDisabled,
            ]}
            disabled={isLoading || !email || !password}
            onPress={handleLogin}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Guest Divider */}
        <View style={styles.dividerRow}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>
            or explore freely
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
        </View>

        {/* Continue as Guest */}
        <TouchableOpacity
          style={[
            styles.guestButton,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
          onPress={enterAsGuest}
          activeOpacity={0.8}
        >
          <Text style={[styles.guestButtonText, { color: colors.textPrimary }]}>
            Continue as Guest Explorer →
          </Text>
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            New to SAFORA?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Create an Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 40,
    },
    backButton: {
      paddingVertical: 8,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    backText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
      gap: 8,
    },
    errorIcon: { fontSize: 16 },
    errorText: {
      flex: 1,
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
    },
    errorDismiss: { padding: 4 },
    errorDismissText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
    form: {
      gap: 18,
      marginBottom: 20,
    },
    inputGroup: {
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    validationIndicator: {
      fontSize: 11,
      fontWeight: '700',
    },
    validText: { color: colors.success },
    invalidText: { color: colors.danger },
    passwordContainer: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      backgroundColor: colors.backgroundInput,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: colors.textPrimary,
      fontSize: 15,
    },
    inputInvalid: {
      borderColor: 'rgba(239, 68, 68, 0.6)',
    },
    passwordInput: {
      paddingRight: 48,
    },
    eyeBtn: {
      position: 'absolute',
      right: 14,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyeIcon: {
      fontSize: 18,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 6,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 18,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      color: colors.textMuted,
      paddingHorizontal: 12,
      fontSize: 12,
    },
    guestButton: {
      backgroundColor: colors.backgroundCard,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    guestButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    footerLink: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
  });
