import React, { useState } from 'react';
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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

export interface OfflineEmergencyModalProps {
  visible: boolean;
  coordinates: { latitude: number; longitude: number };
  guardianNames?: string;
  onClose: () => void;
  onRetryConnection?: () => Promise<boolean>;
}

export const OfflineEmergencyModal: React.FC<OfflineEmergencyModalProps> = ({
  visible,
  coordinates,
  guardianNames = 'Reena and Seema',
  onClose,
  onRetryConnection,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!visible) return null;

  const handleCall112 = () => {
    Linking.openURL('tel:112').catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate dialer for 112.');
    });
  };

  const handlePrepareSms = () => {
    const lat = coordinates.latitude.toFixed(4);
    const lng = coordinates.longitude.toFixed(4);
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    const body = encodeURIComponent(
      `🚨 EMERGENCY SOS! I need immediate help.\nMy live GPS coordinates: ${mapsLink}\nSent via SAFORA Offline Emergency Shield`,
    );
    const uri =
      Platform.OS === 'android' ? `sms:?body=${body}` : `sms:&body=${body}`;
    Linking.openURL(uri).catch(() => {
      Alert.alert('SMS Failed', 'Could not launch carrier SMS composer.');
    });
  };

  const handleRetry = async () => {
    if (onRetryConnection) {
      setIsRetrying(true);
      try {
        const online = await onRetryConnection();
        if (online) {
          Alert.alert('Connected', 'Internet connection restored.');
          onClose();
        } else {
          Alert.alert(
            'Still Offline',
            'Internet connection is still unavailable. Carrier SMS and Calls remain active.',
          );
        }
      } finally {
        setIsRetrying(false);
      }
    } else {
      setIsRetrying(true);
      setTimeout(() => {
        setIsRetrying(false);
        Alert.alert(
          'Offline Mode',
          'Cellular signal active. You can still call 112 or send Emergency SMS.',
        );
      }, 1000);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
        {/* Header (Screen 38) */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerSubtitle, { color: '#F59E0B' }]}>
              Emergency connection · Low/no internet
            </Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Cellular available
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Yellow Alert Icon & Title (Screen 38) */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconBadge}>
              <Feather name="wifi-off" size={28} color="#F59E0B" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              No internet. You still have options.
            </Text>
            <Text
              style={[styles.heroSubtitle, { color: colors.textSecondary }]}
            >
              Mobile signal is available. Calls and SMS may still work through
              your carrier.
            </Text>
          </View>

          {/* Primary Action: Call 112 now */}
          <TouchableOpacity
            style={styles.call112Btn}
            onPress={handleCall112}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Call 112 now"
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
              <Text style={styles.call112BtnText}>Call 112 now</Text>
            </View>
          </TouchableOpacity>

          {/* Send Your Location by SMS Card (Screen 38) */}
          <View
            style={[
              styles.smsCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.smsCardHeader}>
              <Feather
                name="message-square"
                size={16}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.smsCardTitle, { color: colors.textPrimary }]}
              >
                Send your location by SMS
              </Text>
            </View>

            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F1F5F9',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.border,
                },
              ]}
            >
              <Text style={[styles.previewText, { color: colors.textPrimary }]}>
                1. Ambulance / Police: My live location:{' '}
                {coordinates.latitude.toFixed(4)} N,{' '}
                {coordinates.longitude.toFixed(4)} E. Sent via SAFORA SOS.
              </Text>
              <Text
                style={[styles.previewSubText, { color: colors.textMuted }]}
              >
                2. {guardianNames}: Starts your SMS app so your carrier charges
                apply.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.prepareSmsBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={handlePrepareSms}
              activeOpacity={0.85}
            >
              <Text style={styles.prepareSmsBtnText}>
                Prepare emergency SMS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Notes Section (Screen 38) */}
          <View style={styles.statusNotesCol}>
            <View style={styles.statusNoteItem}>
              <Feather
                name="clock"
                size={14}
                color="#F59E0B"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusNoteTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Location waiting to update
                </Text>
                <Text
                  style={[styles.statusNoteDesc, { color: colors.textMuted }]}
                >
                  Last known GPS coordinates recorded locally.
                </Text>
              </View>
            </View>

            <View style={styles.statusNoteItem}>
              <Feather
                name="mic-off"
                size={14}
                color="#38BDF8"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusNoteTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Audio saved on device
                </Text>
                <Text
                  style={[styles.statusNoteDesc, { color: colors.textMuted }]}
                >
                  Audio evidence cannot be uploaded without carrier data.
                </Text>
              </View>
            </View>

            <View style={styles.statusNoteItem}>
              <Feather
                name="info"
                size={14}
                color={colors.textMuted}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.statusNoteDesc, { color: colors.textMuted }]}
                >
                  SMS needs cellular service and data for online features like
                  live radar maps.
                </Text>
              </View>
            </View>
          </View>

          {/* Retry Connection Button */}
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.border }]}
            onPress={handleRetry}
            disabled={isRetrying}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[styles.retryBtnText, { color: colors.textPrimary }]}
              >
                Retry internet connection
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  closeBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  call112Btn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  call112BtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  smsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  smsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  smsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  previewText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  previewSubText: {
    fontSize: 11,
    lineHeight: 15,
  },
  prepareSmsBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepareSmsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statusNotesCol: {
    gap: 12,
    paddingHorizontal: 4,
  },
  statusNoteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusNoteDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  retryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
