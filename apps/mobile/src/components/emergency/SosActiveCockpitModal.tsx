import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import { AudioWaveformBars } from './AudioWaveformBars';

export interface SosActiveCockpitModalProps {
  visible: boolean;
  emergencyId?: string;
  coordinates: { latitude: number; longitude: number };
  guardians: Array<{
    id: string | number;
    name: string;
    phone?: string;
    relationship?: string;
  }>;
  onDisarm: () => void;
  onCallContacts?: () => void;
}

export const SosActiveCockpitModal: React.FC<SosActiveCockpitModalProps> = ({
  visible,
  emergencyId = '12-03',
  coordinates,
  guardians,
  onDisarm,
  onCallContacts,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [audioSeconds, setAudioSeconds] = useState(14);
  const [isAudioRecording, setIsAudioRecording] = useState(true);

  // Audio recording countdown
  useEffect(() => {
    let timer: any;
    if (visible && isAudioRecording && audioSeconds < 30) {
      timer = setInterval(() => {
        setAudioSeconds(prev => {
          if (prev >= 29) {
            setIsAudioRecording(false);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, isAudioRecording, audioSeconds]);

  if (!visible) return null;

  const handleCall112 = () => {
    Linking.openURL('tel:112').catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate dialer for 112.');
    });
  };

  const handleCallFirstGuardian = () => {
    if (guardians.length > 0 && guardians[0].phone) {
      Linking.openURL(`tel:${guardians[0].phone.replace(/\s+/g, '')}`).catch(
        () => {
          Alert.alert('Call Failed', 'Unable to initiate call.');
        },
      );
    } else if (onCallContacts) {
      onCallContacts();
    } else {
      Alert.alert(
        'No Contact Number',
        'No guardian phone numbers are registered.',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDisarm}
    >
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: isDark ? '#0B0F19' : '#F8FAFC',
          },
        ]}
      >
        {/* Red Status Banner on Top (Screen 37) */}
        <View style={styles.topStatusBanner}>
          <View style={styles.topBannerDot} />
          <Text style={styles.topBannerText}>
            SOS is active · Emergency ID #{emergencyId}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Notice Box with Call 112 (Screen 37) */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                borderColor: '#EF4444',
              },
            ]}
          >
            <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
              Your alert has been sent.
            </Text>
            <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
              Stay on the line if calling 112. Emergency services & guardians
              are notified.
            </Text>

            <TouchableOpacity
              style={styles.call112Btn}
              onPress={handleCall112}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Call 112"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather
                  name="phone-call"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.call112BtnText}>Call 112</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Location Sharing Card */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name="map-pin"
                  size={16}
                  color="#10B981"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Location sharing
                </Text>
              </View>
              <View style={styles.recordingPill}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingPillText}>Live GPS</Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Live coordinates: {coordinates.latitude.toFixed(5)},{' '}
              {coordinates.longitude.toFixed(5)} · Updated 2s ago
            </Text>
          </View>

          {/* Emergency Audio Recording Card */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name="mic"
                  size={16}
                  color="#38BDF8"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Emergency audio
                </Text>
              </View>
              <View
                style={[
                  styles.recordingPill,
                  {
                    backgroundColor: isAudioRecording
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.recordingDot,
                    {
                      backgroundColor: isAudioRecording ? '#EF4444' : '#10B981',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.recordingPillText,
                    { color: isAudioRecording ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {isAudioRecording ? 'Recording' : 'Saved'}
                </Text>
              </View>
            </View>

            <View style={styles.waveformContainer}>
              <AudioWaveformBars isRecording={isAudioRecording} />
              <Text
                style={[styles.audioTimerText, { color: colors.textMuted }]}
              >
                Recording 00:{audioSeconds.toString().padStart(2, '0')} of 00:30
              </Text>
            </View>
          </View>

          {/* Who Has Received Your Alert? */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textPrimary, marginBottom: 12 },
              ]}
            >
              Who has received your alert?
            </Text>

            {guardians.length === 0 ? (
              <View style={styles.guardianStatusRow}>
                <Feather
                  name="check"
                  size={14}
                  color="#10B981"
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.guardianName, { color: colors.textPrimary }]}
                  >
                    Reena · Guardian
                  </Text>
                  <Text
                    style={[styles.guardianStatus, { color: colors.textMuted }]}
                  >
                    SMS submitted · delivery in progress
                  </Text>
                </View>
              </View>
            ) : (
              guardians.map((g, idx) => (
                <View key={String(g.id)} style={styles.guardianStatusRow}>
                  <Feather
                    name="check"
                    size={14}
                    color={idx === 0 ? '#10B981' : '#F59E0B'}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.guardianName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {g.name} · {g.relationship || 'Guardian'}
                    </Text>
                    <Text
                      style={[
                        styles.guardianStatus,
                        { color: colors.textMuted },
                      ]}
                    >
                      {idx === 0
                        ? 'SMS submitted · delivery in progress'
                        : 'SMS submitted · delivery not acknowledged'}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <View
              style={[
                styles.guardianStatusRow,
                { borderBottomWidth: 0, marginTop: 4 },
              ]}
            >
              <Feather
                name="shield"
                size={14}
                color="#6366F1"
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.guardianName, { color: colors.textPrimary }]}
                >
                  Emergency Services Dispatcher
                </Text>
                <Text
                  style={[styles.guardianStatus, { color: colors.textMuted }]}
                >
                  Continuous poll · active beacon
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions (Screen 37) */}
        <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.callContactsBtn, { borderColor: colors.border }]}
            onPress={handleCallFirstGuardian}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="phone"
                size={14}
                color={colors.textPrimary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.callContactsBtnText,
                  { color: colors.textPrimary },
                ]}
              >
                Call contacts
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.disarmBtn, { backgroundColor: '#10B981' }]}
            onPress={onDisarm}
            activeOpacity={0.85}
          >
            <Text style={styles.disarmBtnText}>I am safe · Disarm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  topBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  topBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  noticeDesc: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 14,
  },
  call112Btn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  call112BtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 12,
  },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  recordingPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  waveformContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  audioTimerText: {
    fontSize: 11,
    marginTop: 6,
  },
  guardianStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  guardianName: {
    fontSize: 13,
    fontWeight: '700',
  },
  guardianStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  callContactsBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callContactsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disarmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  disarmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
