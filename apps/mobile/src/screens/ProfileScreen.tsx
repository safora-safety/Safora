import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export const ProfileScreen: React.FC = () => {
  const { user, isGuest, logout } = useAuthStore();
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [nightAlerts, setNightAlerts] = useState(true);
  const [vibrateSos, setVibrateSos] = useState(true);

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Campus Security Dispatch',
      relationship: 'DBUU Security Control Room',
      phone: '+91 135 269 4241',
    },
    {
      id: '2',
      name: 'Emergency Guardian (Pooja)',
      relationship: 'Sister / Family',
      phone: '+91 98765 43210',
    },
  ]);

  const testAlert = (contact: Contact) => {
    Alert.alert(
      '🚨 Test Alert Broadcast',
      `Simulating SMS alert to ${contact.name} (${contact.phone}):\n\n"EMERGENCY: Safora user triggered SOS. Live coordinates: 30.3165°N, 78.0322°E (DBUU Campus)."`,
    );
  };

  const addContactPrompt = () => {
    Alert.alert(
      'Add Trusted Contact',
      'Enter name and phone number of your family member, friend, or local campus guardian.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Sample Guardian',
          onPress: () => {
            const newC: Contact = {
              id: Date.now().toString(),
              name: 'Dr. R. Sharma (Warden)',
              relationship: 'Campus Hostel Warden',
              phone: '+91 98123 45678',
            };
            setContacts([...contacts, newC]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Profile & Safety</Text>
        <Text style={styles.headerSubtitle}>
          Account & emergency responder settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {isGuest ? '👤' : user?.name?.charAt(0) || 'U'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {user?.name || 'Guest Explorer'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'guest@safora.app'}
            </Text>

            <View
              style={[
                styles.badge,
                isGuest ? styles.guestBadge : styles.memberBadge,
              ]}
            >
              <Text style={styles.badgeText}>
                {isGuest ? 'GUEST DEMO MODE' : 'VERIFIED SAFORA MEMBER'}
              </Text>
            </View>
          </View>
        </View>

        {/* Guest Upgrade Banner */}
        {isGuest && (
          <View style={styles.guestWarningCard}>
            <Text style={styles.guestWarningTitle}>
              ⚠️ You are in Guest Mode
            </Text>
            <Text style={styles.guestWarningDesc}>
              In guest mode, custom emergency contacts & verified report
              submissions are simulated.
            </Text>
            <TouchableOpacity style={styles.guestSwitchBtn} onPress={logout}>
              <Text style={styles.guestSwitchText}>
                Sign Up / Switch to Real Account →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Contacts Management */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency SOS Contacts</Text>
          <TouchableOpacity onPress={addContactPrompt} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsList}>
          {contacts.map(contact => (
            <View key={contact.id} style={styles.contactItem}>
              <View style={styles.contactIconCircle}>
                <Text style={styles.contactIcon}>📞</Text>
              </View>

              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRel}>{contact.relationship}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>

              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => testAlert(contact)}
              >
                <Text style={styles.testBtnText}>Test</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Safety Preferences */}
        <Text style={styles.sectionTitle}>Safety Preferences</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>High-Accuracy GPS Radar</Text>
              <Text style={styles.settingDesc}>
                Continuous sub-meter PostGIS location buffer
              </Text>
            </View>
            <Switch
              value={highAccuracyGps}
              onValueChange={setHighAccuracyGps}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Night Patrol Hazard Alerts
              </Text>
              <Text style={styles.settingDesc}>
                Push warning when approaching unlit streets after 8 PM
              </Text>
            </View>
            <Switch
              value={nightAlerts}
              onValueChange={setNightAlerts}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic SOS Pulse</Text>
              <Text style={styles.settingDesc}>
                Strong vibration confirmation upon SOS trigger
              </Text>
            </View>
            <Switch
              value={vibrateSos}
              onValueChange={setVibrateSos}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>
            {isGuest ? 'Exit Guest Mode' : 'Sign Out of SAFORA'}
          </Text>
        </TouchableOpacity>
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
    gap: 16,
    paddingBottom: 50,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  guestBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  memberBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  guestWarningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  guestWarningTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
  },
  guestWarningDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  guestSwitchBtn: {
    marginTop: 6,
  },
  guestSwitchText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  contactsList: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 14,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactIcon: {
    fontSize: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  contactRel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  contactPhone: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  testBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  testBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  settingsCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingDesc: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
