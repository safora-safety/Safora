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
import { EditProfileModal } from '../components/EditProfileModal';
import { useTheme } from '../theme/ThemeContext';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export const ProfileScreen: React.FC = () => {
  const { user, isGuest, logout } = useAuthStore();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          User Profile & Safety
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Account & emergency responder settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>
              {isGuest ? '👤' : user?.name?.charAt(0) || 'U'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user?.name || 'Guest Explorer'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email || 'guest@safora.app'}
            </Text>
            {user?.phone ? (
              <Text style={[styles.userPhoneText, { color: colors.primary }]}>
                📞 {user.phone}
              </Text>
            ) : null}

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

          <TouchableOpacity
            style={[
              styles.editBtn,
              {
                backgroundColor: colors.backgroundInput,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setShowEditModal(true)}
            accessibilityLabel="Edit Profile"
          >
            <Text style={[styles.editBtnText, { color: colors.textPrimary }]}>
              ✏️ Edit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Medical Credentials Card */}
        <TouchableOpacity
          style={[
            styles.medicalCard,
            { backgroundColor: colors.backgroundCard },
          ]}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.medicalHeader}>
            <Text style={styles.medicalTitle}>🩸 Emergency Medical Info</Text>
            <Text style={[styles.medicalActionText, { color: colors.primary }]}>
              Update ›
            </Text>
          </View>
          <View style={styles.medicalContent}>
            <View style={styles.bloodChip}>
              <Text style={styles.bloodChipText}>
                {user?.bloodGroup
                  ? `Blood: ${user.bloodGroup}`
                  : 'Blood: Not Set'}
              </Text>
            </View>
            <Text
              style={[styles.medicalNotes, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {user?.emergencyNotes ||
                'Tap to add allergy or critical medical notes for first responders'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Guest Upgrade Banner */}
        {isGuest && (
          <View style={styles.guestWarningCard}>
            <Text style={styles.guestWarningTitle}>
              ⚠️ You are in Guest Mode
            </Text>
            <Text
              style={[styles.guestWarningDesc, { color: colors.textSecondary }]}
            >
              In guest mode, custom emergency contacts & verified report
              submissions are simulated.
            </Text>
            <TouchableOpacity style={styles.guestSwitchBtn} onPress={logout}>
              <Text style={[styles.guestSwitchText, { color: colors.primary }]}>
                Sign Up / Switch to Real Account →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Contacts Management */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Emergency SOS Contacts
          </Text>
          <TouchableOpacity
            onPress={addContactPrompt}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsList}>
          {contacts.map(contact => (
            <View
              key={contact.id}
              style={[
                styles.contactItem,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.contactIconCircle,
                  { backgroundColor: colors.backgroundInput },
                ]}
              >
                <Text style={styles.contactIcon}>📞</Text>
              </View>

              <View style={styles.contactDetails}>
                <Text
                  style={[styles.contactName, { color: colors.textPrimary }]}
                >
                  {contact.name}
                </Text>
                <Text style={[styles.contactRel, { color: colors.textMuted }]}>
                  {contact.relationship}
                </Text>
                <Text style={[styles.contactPhone, { color: colors.primary }]}>
                  {contact.phone}
                </Text>
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Safety Preferences
        </Text>
        <View
          style={[
            styles.settingsCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                High-Accuracy GPS Radar
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.textSecondary }]}
              >
                Continuous sub-meter PostGIS location buffer
              </Text>
            </View>
            <Switch
              value={highAccuracyGps}
              onValueChange={setHighAccuracyGps}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Night Patrol Hazard Alerts
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.textSecondary }]}
              >
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
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                Haptic SOS Pulse
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.textSecondary }]}
              >
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

        {/* Appearance & Theme Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          App Theme
        </Text>
        <View
          style={[
            styles.settingsCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.themeSelectorRow}>
            {[
              { id: 'light', label: '☀️ Light' },
              { id: 'dark', label: '🌙 Dark' },
              { id: 'system', label: '⚙️ Auto' },
            ].map(opt => {
              const isSelected = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
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
                  onPress={() => setThemeMode(opt.id as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      isSelected && { fontWeight: '800' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>
            {isGuest ? 'Exit Guest Mode' : 'Sign Out of SAFORA'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Bottom Sheet Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  content: { padding: 20, gap: 16, paddingBottom: 50 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, color: '#FFFFFF', fontWeight: '800' },
  profileInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontWeight: '800' },
  userEmail: { fontSize: 12 },
  userPhoneText: { fontSize: 11, fontWeight: '600' },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 11, fontWeight: '700' },
  medicalCard: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicalTitle: { fontSize: 13, fontWeight: '800', color: colors.danger },
  medicalActionText: { fontSize: 11, fontWeight: '700' },
  medicalContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bloodChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bloodChipText: { fontSize: 10, fontWeight: '800', color: colors.danger },
  medicalNotes: { flex: 1, fontSize: 11 },
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
  badgeText: { fontSize: 9, fontWeight: '800', color: colors.textPrimary },
  guestWarningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  guestWarningTitle: { color: colors.warning, fontSize: 13, fontWeight: '800' },
  guestWarningDesc: { fontSize: 12, lineHeight: 18 },
  guestSwitchBtn: { marginTop: 6 },
  guestSwitchText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  addBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  contactsList: { gap: 8 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactIcon: { fontSize: 16 },
  contactDetails: { flex: 1 },
  contactName: { fontSize: 13, fontWeight: '700' },
  contactRel: { fontSize: 11 },
  contactPhone: { fontSize: 11, fontWeight: '600' },
  testBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  testBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  settingsCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  settingDesc: { fontSize: 11 },
  themeSelectorRow: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeBtnText: { fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
});
