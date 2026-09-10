import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { user, isGuest, updateProfile, isLoading, error, clearError } =
    useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever modal opens or user changes
  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBloodGroup(user.bloodGroup || null);
      setEmergencyNotes(user.emergencyNotes || '');
      setFormError(null);
      clearError();
    }
  }, [visible, user]);

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleSave = async () => {
    setFormError(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Full name must be at least 2 characters long.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.replace(/[^0-9]/g, '').length < 10) {
      setFormError('Phone number should have at least 10 digits.');
      return;
    }

    const success = await updateProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone || undefined,
      bloodGroup: bloodGroup || undefined,
      emergencyNotes: emergencyNotes.trim() || undefined,
    });

    if (success) {
      Alert.alert(
        'Profile Updated',
        isGuest
          ? 'Guest profile details updated locally.'
          : 'Your personal and emergency credentials have been successfully updated.',
      );
      onClose();
    } else if (error) {
      setFormError(error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.modalOverlay,
          {
            backgroundColor: isDark
              ? 'rgba(5, 8, 15, 0.85)'
              : 'rgba(15, 23, 42, 0.6)',
          },
        ]}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Edit Profile
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Update personal info & emergency medical details
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.backgroundInput },
              ]}
              accessibilityLabel="Close"
            >
              <Text
                style={[styles.closeBtnText, { color: colors.textSecondary }]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guest Notice */}
          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>
                ℹ️ Guest Mode: Changes are saved locally on this device.
              </Text>
            </View>
          )}

          {/* Error Banner */}
          {(formError || error) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{formError || error}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Aditi Verma"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. aditi@dbuu.ac.in"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Emergency Phone Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Blood Group Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Blood Group{' '}
                <Text style={styles.optional}>(For First Responders)</Text>
              </Text>
              <View style={styles.chipsContainer}>
                {BLOOD_GROUPS.map(bg => {
                  const isSelected = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.backgroundInput,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      onPress={() => setBloodGroup(isSelected ? null : bg)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Emergency Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Medical / Emergency Notes{' '}
                <Text style={styles.optional}>(Allergies, Guardian notes)</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={emergencyNotes}
                onChangeText={setEmergencyNotes}
                placeholder="e.g. Penicillin allergy; carry asthma inhaler; Contact Warden hostel block B"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary },
                isLoading && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700' },
  guestNotice: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  guestNoticeText: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  scrollContent: { padding: 20, gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '700' },
  required: { color: '#EF4444' },
  optional: { fontSize: 11, fontWeight: '400' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { height: 80, paddingTop: 12 },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
