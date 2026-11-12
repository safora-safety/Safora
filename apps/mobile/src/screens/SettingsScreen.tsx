import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { ChangePasswordModal } from '../components/profile/ChangePasswordModal';
import { AudioRecorderService } from '../services/audioRecorderService';
import {
  BatteryOptimizationService,
  DeviceInfo,
} from '../services/batteryOptimizationService';
import Feather from 'react-native-vector-icons/Feather';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  );
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { isGuest, logout } = useAuthStore();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hapticSos, setHapticSos] = useState(true);
  const [loudSiren, setLoudSiren] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(true);
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [hazardAlerts, setHazardAlerts] = useState(true);
  const [reachedNotification, setReachedNotification] = useState(true);
  const [micGranted, setMicGranted] = useState(false);

  // Phase 4: OEM Battery Optimization Status & Guide
  const [isBatteryUnrestricted, setIsBatteryUnrestricted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showBatteryGuideModal, setShowBatteryGuideModal] = useState(false);

  // Screens 60 & 61: Clear Cache & Sign Out confirmation modals
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isCacheCleared, setIsCacheCleared] = useState(false);

  useEffect(() => {
    AudioRecorderService.isPermissionGranted().then(setMicGranted);
    BatteryOptimizationService.isIgnoringBatteryOptimizations().then(
      setIsBatteryUnrestricted,
    );
    BatteryOptimizationService.getDeviceInfo().then(setDeviceInfo);
  }, []);

  const handleRequestBatteryExemption = async () => {
    const success =
      await BatteryOptimizationService.requestIgnoreBatteryOptimizations();
    if (success) {
      setTimeout(async () => {
        const unrestricted =
          await BatteryOptimizationService.isIgnoringBatteryOptimizations();
        setIsBatteryUnrestricted(unrestricted);
      }, 1500);
    } else {
      setShowBatteryGuideModal(true);
    }
  };

  const handleOpenManufacturerSettings = async () => {
    await BatteryOptimizationService.openManufacturerPowerSettings();
    setTimeout(async () => {
      const unrestricted =
        await BatteryOptimizationService.isIgnoringBatteryOptimizations();
      setIsBatteryUnrestricted(unrestricted);
    }, 2000);
  };

  const handleManageMic = async () => {
    const granted = await AudioRecorderService.isPermissionGranted();
    if (!granted) {
      const requested = await AudioRecorderService.requestPermission();
      if (requested) {
        setMicGranted(true);
        Alert.alert(
          'Microphone Access Enabled',
          '30-second ambient audio evidence will capture automatically during emergency SOS broadcasts.',
        );
      } else {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@safora_pref_sos_countdown'),
      AsyncStorage.getItem('@safora_pref_haptic_sos'),
      AsyncStorage.getItem('@safora_pref_loud_siren'),
      AsyncStorage.getItem('@safora_pref_high_accuracy_gps'),
      AsyncStorage.getItem('@safora_pref_hazard_alerts'),
      AsyncStorage.getItem('@safora_pref_reached_notification'),
    ]).then(([sos, haptic, siren, gps, hazards, reached]) => {
      if (sos !== null) setSosCountdown(sos === 'true');
      if (haptic !== null) setHapticSos(haptic === 'true');
      if (siren !== null) setLoudSiren(siren === 'true');
      if (gps !== null) setHighAccuracyGps(gps === 'true');
      if (hazards !== null) setHazardAlerts(hazards === 'true');
      if (reached !== null) setReachedNotification(reached === 'true');
    });
  }, []);

  const toggleSosCountdown = (val: boolean) => {
    setSosCountdown(val);
    AsyncStorage.setItem('@safora_pref_sos_countdown', String(val));
  };
  const toggleHapticSos = (val: boolean) => {
    setHapticSos(val);
    AsyncStorage.setItem('@safora_pref_haptic_sos', String(val));
  };
  const toggleLoudSiren = (val: boolean) => {
    setLoudSiren(val);
    AsyncStorage.setItem('@safora_pref_loud_siren', String(val));
  };
  const toggleHighAccuracyGps = (val: boolean) => {
    setHighAccuracyGps(val);
    AsyncStorage.setItem('@safora_pref_high_accuracy_gps', String(val));
  };
  const toggleHazardAlerts = (val: boolean) => {
    setHazardAlerts(val);
    AsyncStorage.setItem('@safora_pref_hazard_alerts', String(val));
  };
  const toggleReachedNotification = (val: boolean) => {
    setReachedNotification(val);
    AsyncStorage.setItem('@safora_pref_reached_notification', String(val));
  };

  const handleClearCache = () => {
    setShowClearCacheModal(true);
  };

  const confirmClearCache = async () => {
    try {
      await AsyncStorage.removeItem('@safora_cached_nearby_hazards');
    } catch {}
    setShowClearCacheModal(false);
    setIsCacheCleared(true);
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    await logout();
    navigation.navigate('AccountSelect');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
            paddingTop: topInset + 10,
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
              onValueChange={toggleSosCountdown}
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
              onValueChange={toggleHapticSos}
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
              onValueChange={toggleLoudSiren}
              trackColor={{ false: '#334155', true: colors.danger }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: OEM Battery & Lock-Screen Protection (Phase 4) */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          LOCK-SCREEN & BATTERY PROTECTION
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: isBatteryUnrestricted
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(245, 158, 11, 0.4)',
            },
          ]}
        >
          <View style={{ padding: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: colors.textPrimary,
                }}
              >
                {isBatteryUnrestricted
                  ? '🛡️ Background Protection Active'
                  : '⚡ Background Limits Detected'}
              </Text>
              <View
                style={{
                  backgroundColor: isBatteryUnrestricted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                  borderColor: isBatteryUnrestricted
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(245, 158, 11, 0.4)',
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: isBatteryUnrestricted ? '#10B981' : '#F59E0B',
                    fontSize: 10,
                    fontWeight: '800',
                  }}
                >
                  {isBatteryUnrestricted ? 'UNRESTRICTED' : 'ACTION NEEDED'}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              {isBatteryUnrestricted
                ? 'Your device allows SAFORA to run continuously with the screen locked. Emergency SOS broadcasts and Safe Walk live audio streaming will never be paused.'
                : `${
                    deviceInfo?.manufacturer
                      ? deviceInfo.manufacturer.toUpperCase()
                      : 'Your device'
                  } battery saver may freeze GPS tracking and locked-screen microphone recording after 2-3 minutes. Allow Unrestricted activity for guaranteed locked-screen safety.`}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!isBatteryUnrestricted && (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 9,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleRequestBatteryExemption}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather
                      name="zap"
                      size={13}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      Remove Limits
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                  borderWidth: 1,
                  paddingVertical: 9,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setShowBatteryGuideModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather
                    name="book-open"
                    size={13}
                    color={colors.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    Setup Guide ›
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 3: Location & Radar */}
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
              onValueChange={toggleHighAccuracyGps}
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
              onValueChange={toggleHazardAlerts}
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
              onValueChange={toggleReachedNotification}
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
              { id: 'light', label: 'Light', icon: 'sun' },
              { id: 'dark', label: 'Dark', icon: 'moon' },
              { id: 'system', label: 'Auto', icon: 'monitor' },
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
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() => setThemeMode(item.id as any)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={item.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
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

        {/* Section 5: Security & Credentials */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SECURITY & CREDENTIALS
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
            onPress={() => {
              if (isGuest) {
                Alert.alert(
                  '🔒 Feature Locked in Guest Mode',
                  'Guest explorers do not have an account password. Would you like to sign in or create a verified citizen account?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign In / Switch Account',
                      onPress: () => navigation.navigate('AccountSelect'),
                    },
                  ],
                );
              } else {
                setShowPasswordModal(true);
              }
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name="lock"
                  size={16}
                  color={isGuest ? colors.textMuted : colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.actionItemText,
                    { color: isGuest ? colors.textMuted : colors.textPrimary },
                  ]}
                >
                  Change Account Password
                </Text>
              </View>
              <Text
                style={{
                  color: isGuest ? colors.textMuted : colors.primary,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {isGuest ? '🔒 Locked (Guest)' : 'Update ›'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionItem} onPress={handleManageMic}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather
                    name="mic"
                    size={16}
                    color={colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.actionItemText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Microphone Evidence Permission
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    marginTop: 2,
                    marginLeft: 24,
                  }}
                >
                  Captures 30s ambient audio during emergency SOS broadcasts
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: micGranted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: micGranted ? '#10B981' : '#EF4444',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {micGranted ? '✓ Allowed' : 'Enable ›'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 6: Legal & Safety Policies */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          LEGAL & SAFETY POLICIES
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
            onPress={() => navigation.navigate('Terms')}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name="shield"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[styles.actionItemText, { color: colors.textPrimary }]}
                >
                  Safety Terms & Privacy Policy
                </Text>
              </View>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                View ›
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 7: Data & Actions */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="trash-2"
                size={16}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.actionItemText, { color: colors.textPrimary }]}
              >
                Clear Local Map Cache & Routes
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOutPress}
        >
          <Text style={styles.signOutText}>
            {isGuest ? 'Exit Guest Mode' : 'Sign Out of SAFORA'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>
          SAFORA Community Safety Network • v1.0.0
        </Text>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* OEM Battery Optimization Guide Modal (Phase 4) */}
      <Modal
        visible={showBatteryGuideModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBatteryGuideModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.backgroundCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderTopWidth: 1,
              borderColor: colors.border,
              maxHeight: '85%',
            }}
          >
            {(() => {
              const guide = BatteryOptimizationService.getManufacturerGuide(
                deviceInfo?.manufacturer,
              );
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}
                      >
                        {guide.brandName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {guide.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowBatteryGuideModal(false)}
                      style={{ padding: 6 }}
                    >
                      <Feather name="x" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Feather
                      name="alert-triangle"
                      size={13}
                      color="#F59E0B"
                      style={{ marginRight: 6, marginTop: 2 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#F59E0B',
                        lineHeight: 18,
                        flex: 1,
                      }}
                    >
                      {guide.description}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.textSecondary,
                      marginBottom: 10,
                      letterSpacing: 0.5,
                    }}
                  >
                    STEP-BY-STEP INSTRUCTIONS:
                  </Text>

                  <View style={{ marginBottom: 20 }}>
                    {guide.steps.map((step, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                            marginTop: 1,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {idx + 1}
                          </Text>
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: colors.textPrimary,
                            lineHeight: 20,
                          }}
                        >
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                    onPress={handleOpenManufacturerSettings}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Feather
                        name="settings"
                        size={14}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: '800',
                        }}
                      >
                        Open Device Power Settings
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.backgroundInput,
                      borderColor: colors.border,
                      borderWidth: 1,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setShowBatteryGuideModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        fontWeight: '700',
                      }}
                    >
                      Done / Close
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Screen 60: Clear map cache confirmation modal */}
      <Modal
        visible={showClearCacheModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearCacheModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View
            style={[
              styles.confirmModalCard,
              {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.95)'
                  : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={styles.clearCacheIconCircle}>
              <Feather name="trash-2" size={24} color={colors.primary} />
            </View>
            <Text
              style={[styles.confirmModalTitle, { color: colors.textPrimary }]}
            >
              Clear map cache?
            </Text>
            <Text
              style={[
                styles.confirmModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              This will remove 24 MB of cached Dehradun maps. They will
              re-download when you open the map.
            </Text>
            <TouchableOpacity
              style={[
                styles.clearCacheConfirmBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={confirmClearCache}
              activeOpacity={0.8}
            >
              <Text style={styles.clearCacheConfirmText}>Clear cache</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmCancelBtn,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowClearCacheModal(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmCancelText,
                  { color: colors.textPrimary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Screen 61: Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View
            style={[
              styles.confirmModalCard,
              {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.95)'
                  : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={styles.signOutIconCircle}>
              <Feather name="user" size={24} color="#EF4444" />
            </View>
            <Text
              style={[styles.confirmModalTitle, { color: colors.textPrimary }]}
            >
              Sign out of SAFORA?
            </Text>
            <Text
              style={[
                styles.confirmModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Your guardians and saved places stay on your account.
            </Text>
            <TouchableOpacity
              style={styles.signOutConfirmBtn}
              onPress={confirmSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutConfirmText}>Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmCancelBtn,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowSignOutModal(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmCancelText,
                  { color: colors.textPrimary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 14,
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
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  clearCacheIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  signOutIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  clearCacheConfirmBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearCacheConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  signOutConfirmBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmCancelBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
