import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

export interface ArrivalCelebrationModalProps {
  visible: boolean;
  destinationName: string;
  distanceMeters?: number;
  durationSeconds?: number;
  guardianName?: string;
  onClose: () => void;
  primaryContactPhone?: string;
}

export const ArrivalCelebrationModal: React.FC<
  ArrivalCelebrationModalProps
> = ({
  visible,
  destinationName,
  distanceMeters = 850,
  durationSeconds = 480,
  guardianName,
  onClose,
  primaryContactPhone,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const arrivalTime = React.useMemo(() => {
    const d = new Date();
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  }, [visible]);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins} min`;
  };

  const getShareText = () => {
    return encodeURIComponent(
      `✅ Hey! I have arrived safely at ${destinationName}.\nMy SAFORA Safe Walk escort is completed.\nDistance: ${formatDistance(distanceMeters)} · Duration: ${formatDuration(durationSeconds)}`,
    );
  };

  const handleShareRouteUpdate = () => {
    const text = getShareText();
    const phone = primaryContactPhone
      ? primaryContactPhone.replace(/\s+/g, '')
      : '';
    const whatsappUrl = `whatsapp://send?text=${text}`;
    const smsUrl = phone ? `sms:${phone}?body=${text}` : `sms:?body=${text}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(smsUrl).catch(() => {
        Alert.alert(
          'Share Route Update',
          'Could not open messaging app. Please ensure WhatsApp or SMS app is installed.',
        );
      });
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? 'rgba(30, 41, 59, 0.96)'
                : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : colors.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Emerald Check Icon Badge */}
          <View style={styles.badgeRingOuter}>
            <View style={styles.badgeRingInner}>
              <Feather name="check" size={28} color="#10B981" />
            </View>
          </View>

          {/* Walk Complete Pill */}
          <View style={styles.walkCompletePill}>
            <Text style={styles.walkCompletePillText}>Walk complete</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            You have arrived at{'\n'}
            {destinationName}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your circle has been notified. Thanks for checking in with your
            circle.
          </Text>

          {/* Info Status Cards (Screen 35) */}
          <View style={styles.infoCardsContainer}>
            {/* Guardian Notified Card */}
            <View
              style={[
                styles.infoCardItem,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.border,
                },
              ]}
            >
              <View style={styles.infoCardIconBox}>
                <Feather name="check-circle" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.infoCardTitle, { color: colors.textPrimary }]}
                >
                  {guardianName || 'Your circle'} has been notified
                </Text>
                <Text
                  style={[styles.infoCardDesc, { color: colors.textMuted }]}
                >
                  Arrival message delivered at {arrivalTime}
                </Text>
              </View>
            </View>

            {/* Live Sharing Stopped Card */}
            <View
              style={[
                styles.infoCardItem,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.border,
                },
              ]}
            >
              <View style={styles.infoCardIconBox}>
                <Feather name="shield" size={16} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.infoCardTitle, { color: colors.textPrimary }]}
                >
                  Live sharing has stopped
                </Text>
                <Text
                  style={[styles.infoCardDesc, { color: colors.textMuted }]}
                >
                  Guardians no longer see your location
                </Text>
              </View>
            </View>
          </View>

          {/* Journey Statistics Capsule */}
          <View
            style={[
              styles.statsRow,
              {
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.5)'
                  : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  typography.tabularNums,
                  { color: colors.textPrimary },
                ]}
              >
                {formatDistance(distanceMeters)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Distance
              </Text>
            </View>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  typography.tabularNums,
                  { color: colors.textPrimary },
                ]}
              >
                {formatDuration(durationSeconds)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Duration
              </Text>
            </View>
          </View>

          {/* Action Buttons (Screen 35) */}
          <View style={styles.actionCol}>
            {/* Primary: Back to home */}
            <TouchableOpacity
              style={[styles.backHomeBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close arrival dialog"
            >
              <Text style={styles.backHomeBtnText}>Back to home</Text>
            </TouchableOpacity>

            {/* Secondary: Share a route update */}
            <TouchableOpacity
              style={[
                styles.shareRouteBtn,
                {
                  backgroundColor: 'transparent',
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={handleShareRouteUpdate}
              accessibilityRole="button"
              accessibilityLabel="Share a route update"
            >
              <Text
                style={[
                  styles.shareRouteBtnText,
                  { color: colors.textPrimary },
                ]}
              >
                Share a route update
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  badgeRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walkCompletePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 8,
  },
  walkCompletePillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  infoCardsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  infoCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  infoCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  actionCol: {
    width: '100%',
    gap: 10,
  },
  backHomeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  shareRouteBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareRouteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
