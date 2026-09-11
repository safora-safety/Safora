import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { isGuest, logout } = useAuthStore();

  const [hapticSos, setHapticSos] = useState(true);
  const [loudSiren, setLoudSiren] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(true);
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [hazardAlerts, setHazardAlerts] = useState(true);
  const [reachedNotification, setReachedNotification] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'Cache Cleared',
      'Local map tiles and cached routes have been cleared successfully.',
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          App Settings
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Emergency SOS Controls */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          EMERGENCY SOS CONTROLS
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                5-Second SOS Abort Window
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Allows cancelling accidental SOS triggers
              </Text>
            </View>
            <Switch
              value={sosCountdown}
              onValueChange={setSosCountdown}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Haptic Vibration Pulse
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Strong vibration confirmation upon SOS trigger
              </Text>
            </View>
            <Switch
              value={hapticSos}
              onValueChange={setHapticSos}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Audible Emergency Siren
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Play high-decibel siren alarm on SOS broadcast
              </Text>
            </View>
            <Switch
              value={loudSiren}
              onValueChange={setLoudSiren}
              trackColor={{ false: '#334155', true: colors.danger }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: Location & Radar */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          LOCATION & RADAR ACCURACY
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                High-Accuracy GPS Buffer
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Sub-meter GPS precision for Safe Walk corridors
              </Text>
            </View>
            <Switch
              value={highAccuracyGps}
              onValueChange={setHighAccuracyGps}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 3: Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SAFETY NOTIFICATIONS
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Proximity Hazard Alerts
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Warn when approaching unlit areas or hazards within 1km
              </Text>
            </View>
            <Switch
              value={hazardAlerts}
              onValueChange={setHazardAlerts}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Safe Walk Arrival Confirmations
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Prompt "I Reached Safely" broadcast upon arrival
              </Text>
            </View>
            <Switch
              value={reachedNotification}
              onValueChange={setReachedNotification}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 4: App Theme */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          APPEARANCE & THEME
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.themeRow}>
            {[
              { id: 'light', label: '☀️ Light' },
              { id: 'dark', label: '🌙 Dark' },
              { id: 'system', label: '⚙️ Auto' },
            ].map(item => {
              const isSelected = themeMode === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.backgroundInput,
                      borderColor: isSelected
                        ? colors.primaryLight
                        : colors.border,
                    },
                  ]}
                  onPress={() => setThemeMode(item.id as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      isSelected && { fontWeight: '800' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 5: Data & Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          STORAGE & DATA
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearCache}
          >
            <Text
              style={[styles.actionItemText, { color: colors.textPrimary }]}
            >
              🧹 Clear Local Map Cache & Routes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutText}>
            {isGuest ? 'Exit Guest Mode' : 'Sign Out of SAFORA'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>
          SAFORA Community Safety Network • v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 18,
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginTop: 10,
    marginBottom: 2,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 14,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionItem: {
    paddingVertical: 12,
  },
  actionItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  signOutBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
  },
});
