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
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

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
  const insets = useSafeAreaInsets();
  const {
    user,
    isGuest,
    updateProfile,
    uploadProfilePhoto,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [allergies, setAllergies] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state whenever modal opens or user changes
  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAge(user.age ? String(user.age) : '');
      setAllergies((user as any).allergies || '');
      setBloodGroup(user.bloodGroup || null);
      setEmergencyNotes(user.emergencyNotes || '');
      setFormError(null);
      clearError();
    }
  }, [visible, user]);

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      {
        text: 'Take Photo',
        onPress: () => {
          launchCamera({ mediaType: 'photo', quality: 0.8 }, async response => {
            if (response.assets && response.assets[0]?.uri) {
              const asset = response.assets[0];
              setIsUploadingPhoto(true);
              try {
                await uploadProfilePhoto(asset.uri, asset.fileName, asset.type);
              } catch {
                Alert.alert('Upload Error', 'Failed to upload photo.');
              } finally {
                setIsUploadingPhoto(false);
              }
            }
          });
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: () => {
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.8 },
            async response => {
              if (response.assets && response.assets[0]?.uri) {
                const asset = response.assets[0];
                setIsUploadingPhoto(true);
                try {
                  await uploadProfilePhoto(
                    asset.uri,
                    asset.fileName,
                    asset.type,
                  );
                } catch {
                  Alert.alert('Upload Error', 'Failed to upload photo.');
                } finally {
                  setIsUploadingPhoto(false);
                }
              }
            },
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

    const parsedAge = age.trim() ? parseInt(age.trim(), 10) : undefined;

    const success = await updateProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone || undefined,
      age: parsedAge,
      allergies: allergies.trim() || undefined,
      bloodGroup: bloodGroup || undefined,
      emergencyNotes: emergencyNotes.trim() || undefined,
    } as any);

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
              paddingBottom: Math.max(insets.bottom, 16) + 12,
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
            {/* Screen 55: Avatar with Change Photo */}
            <View style={styles.avatarSection}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primary },
                ]}
              >
                {(user as any)?.avatar ? (
                  <Image
                    source={{ uri: (user as any).avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {user?.name
                      ? user.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2)
                      : 'AS'}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.cameraBadge,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={styles.changePhotoBtn}
                activeOpacity={0.7}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[styles.changePhotoText, { color: colors.primary }]}
                  >
                    Change photo
                  </Text>
                )}
              </TouchableOpacity>
            </View>

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
                placeholder="e.g. Aditi Sharma"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Phone
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

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Email <Text style={styles.required}>*</Text>
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
                placeholder="e.g. aditi@safora.app"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Section Header: EMERGENCY MEDICAL INFO */}
            <Text
              style={[styles.sectionHeading, { color: colors.textSecondary }]}
            >
              EMERGENCY MEDICAL INFO
            </Text>

            {/* Blood Group Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Blood group
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

            {/* Age */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Age
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
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 21"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Allergies */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Allergies
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
                value={allergies}
                onChangeText={setAllergies}
                placeholder="e.g. None or Penicillin"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Emergency Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Emergency note
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
                placeholder="e.g. Anything responders should know"
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    marginTop: 8,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 8,
  },
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

export default EditProfileModal;
