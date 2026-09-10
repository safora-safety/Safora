import React, { useState } from 'react';
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
import { HazardCategory, HazardReport } from '@safora/shared-types';
import { ReportService } from '../services/reportService';

interface ReportHazardModalProps {
  visible: boolean;
  onClose: () => void;
  coordinates: { latitude: number; longitude: number };
  onReportCreated: (report: HazardReport) => void;
}

const CATEGORIES: { id: HazardCategory; label: string; icon: string }[] = [
  { id: 'lighting', label: 'Poor Lighting', icon: '💡' },
  { id: 'road_hazard', label: 'Road Trench / Hazard', icon: '🚧' },
  { id: 'waterlogging', label: 'Waterlogging', icon: '🌊' },
  { id: 'isolated_area', label: 'Isolated Trail', icon: '🌲' },
  { id: 'traffic', label: 'Traffic Danger', icon: '🚗' },
  { id: 'other', label: 'Other Hazard', icon: '⚠️' },
];

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  visible,
  onClose,
  coordinates,
  onReportCreated,
}) => {
  const { colors, isDark } = useTheme();
  const [category, setCategory] = useState<HazardCategory>('lighting');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(3);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setFormError('Please enter a descriptive hazard title (min 3 chars).');
      return;
    }

    setLoading(true);
    try {
      const created = await ReportService.create({
        category,
        title: trimmedTitle,
        description: description.trim() || undefined,
        severity,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      Alert.alert(
        'Hazard Reported',
        'Thank you! Your safety report has been added to the community radar.',
      );
      onReportCreated(created);
      setTitle('');
      setDescription('');
      setSeverity(3);
      onClose();
    } catch {
      setFormError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityLabel = (sev: number) => {
    switch (sev) {
      case 1:
        return '1 - Minor Nuisance';
      case 2:
        return '2 - Low Risk';
      case 3:
        return '3 - Moderate Caution';
      case 4:
        return '4 - High Risk Danger';
      case 5:
        return '5 - Critical Emergency';
      default:
        return `${sev}`;
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
          styles.overlay,
          {
            backgroundColor: isDark
              ? 'rgba(5, 8, 15, 0.85)'
              : 'rgba(15, 23, 42, 0.6)',
          },
        ]}
      >
        <View
          style={[
            styles.container,
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
                Report Campus Hazard
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                📍 Pin at ({coordinates.latitude.toFixed(4)},{' '}
                {coordinates.longitude.toFixed(4)})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.backgroundInput },
              ]}
            >
              <Text
                style={[styles.closeBtnText, { color: colors.textSecondary }]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Category Chips */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Hazard Category
              </Text>
              <View style={styles.chipsContainer}>
                {CATEGORIES.map(cat => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
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
                      onPress={() => setCategory(cat.id)}
                    >
                      <Text style={styles.chipIcon}>{cat.icon}</Text>
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
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Title */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Hazard Title <Text style={styles.req}>*</Text>
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
                placeholder="e.g. Street lights broken outside Hostel 3"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Severity Picker */}
            <View style={styles.group}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Severity Level
                </Text>
                <Text
                  style={[
                    styles.sevLabel,
                    {
                      color: severity >= 4 ? colors.danger : colors.warning,
                    },
                  ]}
                >
                  {getSeverityLabel(severity)}
                </Text>
              </View>
              <View style={styles.sevRow}>
                {[1, 2, 3, 4, 5].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.sevButton,
                      {
                        backgroundColor:
                          severity === num
                            ? num >= 4
                              ? colors.danger
                              : num === 3
                                ? colors.warning
                                : colors.info
                            : colors.backgroundInput,
                        borderColor:
                          severity === num ? '#FFFFFF' : colors.border,
                      },
                    ]}
                    onPress={() => setSeverity(num)}
                  >
                    <Text
                      style={[
                        styles.sevButtonText,
                        {
                          color:
                            severity === num ? '#FFFFFF' : colors.textSecondary,
                        },
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Additional Details <Text style={styles.opt}>(Optional)</Text>
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
                placeholder="Describe landmark or specific danger points..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </ScrollView>

          {/* Footer */}
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
              disabled={loading}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary },
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Hazard Pin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700' },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  content: { padding: 20, gap: 16 },
  group: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '700' },
  sevLabel: { fontSize: 11, fontWeight: '700' },
  req: { color: '#EF4444' },
  opt: { fontSize: 11, fontWeight: '400' },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { height: 75, paddingTop: 12 },
  sevRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sevButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevButtonText: { fontSize: 13, fontWeight: '800' },
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
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
