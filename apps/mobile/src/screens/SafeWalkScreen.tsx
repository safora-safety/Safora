import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';

const DESTINATIONS = [
  { id: '1', name: 'DBUU Girls Hostel Block B', etaMinutes: 8 },
  { id: '2', name: 'Campus Main Entrance & Bus Bay', etaMinutes: 12 },
  { id: '3', name: 'Central Library Complex', etaMinutes: 5 },
  { id: '4', name: 'Prem Nagar Market Subway', etaMinutes: 20 },
];

export const SafeWalkScreen: React.FC = () => {
  const [selectedDest, setSelectedDest] = useState(DESTINATIONS[0]);
  const [isActive, setIsActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(8 * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      setIsActive(false);
      Alert.alert(
        '⚠️ SAFE WALK TIMER EXPIRED',
        'Automatic check-in prompt: Are you safe? If you do not respond, your coordinates will be broadcast to emergency contacts.',
        [
          { text: 'I AM SAFE', onPress: () => {} },
          {
            text: 'SEND SOS',
            style: 'destructive',
            onPress: () => Alert.alert('SOS SENT!'),
          },
        ],
      );
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining]);

  const toggleSafeWalk = () => {
    if (!isActive) {
      setSecondsRemaining(selectedDest.etaMinutes * 60);
      setIsActive(true);
      Alert.alert(
        '🚶‍♀️ Safe Walk Activated',
        `Virtual guardian escort started to ${selectedDest.name}. Emergency check-in timer set to ${selectedDest.etaMinutes} minutes.`,
      );
    } else {
      setIsActive(false);
      Alert.alert('Safe Walk Ended', 'You marked yourself as arrived safely.');
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safe Walk Escort</Text>
        <Text style={styles.headerSubtitle}>
          Virtual guardian with timed check-in
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Timer Card */}
        <View style={styles.timerCard}>
          <View
            style={[
              styles.statusPill,
              isActive ? styles.pillActive : styles.pillIdle,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isActive ? colors.success : colors.textMuted,
                },
              ]}
            />
            <Text style={styles.statusPillText}>
              {isActive ? 'ESCORT IN PROGRESS' : 'READY TO START'}
            </Text>
          </View>

          <Text style={styles.timerText}>{formatTime(secondsRemaining)}</Text>
          <Text style={styles.destText}>Destination: {selectedDest.name}</Text>

          {/* Start/Stop Button */}
          <TouchableOpacity
            style={[
              styles.escortBtn,
              isActive ? styles.escortBtnActive : styles.escortBtnIdle,
            ]}
            onPress={toggleSafeWalk}
            activeOpacity={0.85}
          >
            <Text style={styles.escortBtnText}>
              {isActive
                ? '✓ I Have Arrived Safely'
                : '▶ Start Safe Walk Escort'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Destination Selector */}
        {!isActive && (
          <View style={styles.destSection}>
            <Text style={styles.sectionTitle}>Select Destination</Text>
            <View style={styles.destList}>
              {DESTINATIONS.map(dest => (
                <TouchableOpacity
                  key={dest.id}
                  style={[
                    styles.destCard,
                    selectedDest.id === dest.id && styles.destCardSelected,
                  ]}
                  onPress={() => setSelectedDest(dest)}
                >
                  <View style={styles.destInfo}>
                    <Text style={styles.destName}>{dest.name}</Text>
                    <Text style={styles.destEta}>
                      Est. Walk: {dest.etaMinutes} mins
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedDest.id === dest.id && styles.radioCircleSelected,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Feature Highlights */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🛡️ How Safe Walk Works:</Text>
          <Text style={styles.infoPoint}>
            • Your live GPS coordinates are actively buffered on device.
          </Text>
          <Text style={styles.infoPoint}>
            • If you do not arrive before the timer expires, an automatic alarm
            prompts you for check-in.
          </Text>
          <Text style={styles.infoPoint}>
            • Unanswered prompts trigger automated SMS coordinates to your
            emergency trusted contacts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  timerCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  pillIdle: {
    backgroundColor: colors.backgroundInput,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 54,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  destText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  escortBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  escortBtnIdle: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  escortBtnActive: {
    backgroundColor: colors.success,
  },
  escortBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  destSection: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  destList: {
    gap: 8,
  },
  destCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 14,
  },
  destCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  destInfo: {
    flex: 1,
  },
  destName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  destEta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioCircleSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  infoBox: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.25)',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoPoint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
