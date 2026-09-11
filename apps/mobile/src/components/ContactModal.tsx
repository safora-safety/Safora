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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SosService } from '../services/sosService';

export interface EditableContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isHelpline?: boolean;
}

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (contact: {
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    id?: string;
  }) => void;
  initialData?: EditableContact | null;
}

const RELATIONSHIP_PRESETS = [
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Spouse',
  'Friend',
  'Guardian',
  'Neighbor',
];

export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Guardian');
  const [customRel, setCustomRel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time guardian account verification state
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [guardianName, setGuardianName] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      if (RELATIONSHIP_PRESETS.includes(initialData.relationship)) {
        setRelationship(initialData.relationship);
        setCustomRel('');
      } else {
        setRelationship('Other');
        setCustomRel(initialData.relationship || '');
      }
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setRelationship('Guardian');
      setCustomRel('');
    }
    setFormError(null);
    setHasAccount(null);
    setGuardianName(null);
  }, [initialData, visible]);

  // Debounced email check against Safora DB
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setHasAccount(null);
      setGuardianName(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      const res = await SosService.checkGuardian(trimmed);
      setHasAccount(res.exists);
      setGuardianName(res.name || null);
      setIsCheckingEmail(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/[^0-9+]/g, '');
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setFormError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    // Indian & Universal phone validation: at least 10 digits
    const digitsOnly = trimmedPhone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (
      trimmedEmail.length > 0 &&
      (!trimmedEmail.includes('@') || !trimmedEmail.includes('.'))
    ) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const finalRel =
      relationship === 'Other'
        ? customRel.trim() || 'Trusted Contact'
        : relationship;

    onSave({
      id: initialData?.id,
      name: trimmedName,
      phone: trimmedPhone.startsWith('+')
        ? trimmedPhone
        : `+91 ${trimmedPhone}`,
      email: trimmedEmail || undefined,
      relationship: finalRel,
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.modalContent,
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
                {initialData
                  ? 'Edit Emergency Contact'
                  : 'Add Emergency Contact'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Will receive priority SOS notifications, live GPS, and audio
                evidence
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
          >
            {formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {formError}</Text>
              </View>
            )}

            {/* Name Input */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Full Name <Text style={styles.req}>*</Text>
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
                placeholder="e.g. Papa, Pooja Sharma, Rohan"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone Number Input */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Mobile Number <Text style={styles.req}>*</Text>
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
                placeholder="e.g. 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Email Address Input (for In-App Alerts & 30s Audio) */}
            <View style={styles.group}>
              <View style={styles.labelWithBadge}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Email Address{' '}
                  <Text style={styles.optional}>
                    (for in-app alerts & 30s audio)
                  </Text>
                </Text>
                {isCheckingEmail && (
                  <ActivityIndicator size="small" color="#38BDF8" />
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor:
                      hasAccount === true
                        ? '#10B981'
                        : hasAccount === false
                          ? '#F59E0B'
                          : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="e.g. parent@gmail.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {/* Dynamic Safora Account Badge */}
              {hasAccount === true && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>
                    🟢 Registered on Safora ({guardianName || 'Active Account'})
                    • In-app push alerts & 30s live audio enabled!
                  </Text>
                </View>
              )}
              {hasAccount === false && (
                <View style={styles.badgeWarning}>
                  <Text style={styles.badgeWarningText}>
                    📱 Direct SMS Only • Guardian is not registered on Safora
                    yet. They will receive cellular SMS text alerts.
                  </Text>
                </View>
              )}
            </View>

            {/* Relationship Presets */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Relationship
              </Text>
              <View style={styles.presetsWrap}>
                {RELATIONSHIP_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor:
                          relationship === preset
                            ? 'rgba(56, 189, 248, 0.15)'
                            : colors.backgroundInput,
                        borderColor:
                          relationship === preset ? '#38BDF8' : colors.border,
                      },
                    ]}
                    onPress={() => setRelationship(preset)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color:
                            relationship === preset
                              ? '#38BDF8'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor:
                        relationship === 'Other'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : colors.backgroundInput,
                      borderColor:
                        relationship === 'Other' ? '#38BDF8' : colors.border,
                    },
                  ]}
                  onPress={() => setRelationship('Other')}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color:
                          relationship === 'Other'
                            ? '#38BDF8'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Other...
                  </Text>
                </TouchableOpacity>
              </View>

              {relationship === 'Other' && (
                <TextInput
                  style={[
                    styles.input,
                    {
                      marginTop: 8,
                      backgroundColor: colors.backgroundInput,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Specify relationship (e.g. Roommate, Mentor)"
                  placeholderTextColor={colors.textMuted}
                  value={customRel}
                  onChangeText={setCustomRel}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {initialData ? 'Update Contact' : 'Save Contact'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, fontWeight: '700' },
  form: { padding: 20, gap: 16 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  group: { gap: 8 },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 13, fontWeight: '700' },
  optional: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },
  req: { color: '#EF4444' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeWarningText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  presetChipText: { fontSize: 11, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '700', fontSize: 13 },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
