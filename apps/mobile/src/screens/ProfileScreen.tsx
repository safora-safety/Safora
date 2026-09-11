import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { EditProfileModal } from '../components/EditProfileModal';
import { useTheme } from '../theme/ThemeContext';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isHelpline?: boolean;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isGuest, logout } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);

  // Universal Emergency Responders & Helplines (Police 112, Ambulance 108, Women 1090)
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 'police-112',
      name: 'Police Emergency Response',
      relationship: 'National Emergency Helpline',
      phone: '112',
      isHelpline: true,
    },
    {
      id: 'ambulance-108',
      name: 'Ambulance & Medical Emergency',
      relationship: 'National Medical Dispatch',
      phone: '108',
      isHelpline: true,
    },
    {
      id: 'women-helpline',
      name: 'Women Safety Helpline',
      relationship: '24/7 Citizen Women Helpline',
      phone: '1090',
      isHelpline: true,
    },
    {
      id: 'family-1',
      name: 'Emergency Guardian (Family)',
      relationship: 'Primary Family Guardian',
      phone: '+91 98765 43210',
      isHelpline: false,
    },
  ]);

  const testAlert = (contact: Contact) => {
    if (contact.isHelpline) {
      Alert.alert(
        `Direct Call: ${contact.name}`,
        `Emergency helpline: ${contact.phone}\nWould you like to dial this number now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Now',
            onPress: () => Linking.openURL(`tel:${contact.phone}`),
          },
        ],
      );
      return;
    }

    Alert.alert(
      '🚨 Test Alert Dispatched',
      `Simulated live SOS SMS alert to ${contact.name} (${contact.phone}):\n\n"EMERGENCY ALERT: Safora user triggered SOS. Live coordinates: 30.3165°N, 78.0322°E."`,
    );
  };

  const addContactPrompt = () => {
    Alert.alert(
      'Add Family Guardian',
      'Add a trusted family member or close friend to your emergency network.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Sample Guardian',
          onPress: () => {
            const newC: Contact = {
              id: Date.now().toString(),
              name: 'Dr. A. Verma',
              relationship: 'Trusted Family Contact',
              phone: '+91 98112 34567',
              isHelpline: false,
            };
            setContacts([...contacts, newC]);
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SAFORA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.navigate('AccountSelect');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Top Header with Dedicated Settings Button */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Profile & Safety
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            Citizen credentials & emergency dispatch
          </Text>
        </View>

        {/* Dedicated Settings Button */}
        <TouchableOpacity
          style={[
            styles.settingsIconBtn,
            {
              backgroundColor: colors.backgroundInput,
              borderColor: colors.border,
            },
          ]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsIconEmoji}>⚙️</Text>
        </TouchableOpacity>
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
            style={[
              styles.avatarCircle,
              { backgroundColor: isGuest ? '#F59E0B' : colors.primary },
            ]}
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
                {isGuest ? 'GUEST CITIZEN' : 'VERIFIED SAFORA CITIZEN'}
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
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
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
                  : 'Blood Group: Not Set'}
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

        {/* Guest Mode Banner */}
        {isGuest && (
          <View
            style={[
              styles.guestWarningCard,
              {
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              },
            ]}
          >
            <Text style={styles.guestWarningTitle}>
              👤 You are currently in Guest Mode
            </Text>
            <Text
              style={[styles.guestWarningDesc, { color: colors.textSecondary }]}
            >
              Guest mode allows viewing community safety heatmaps. To save
              emergency contacts, enable family push loops, and report hazards,
              create a verified account.
            </Text>
            <TouchableOpacity
              style={styles.guestSwitchBtn}
              onPress={() =>
                navigation.navigate('Auth', { initialTab: 'register' })
              }
            >
              <Text style={[styles.guestSwitchText, { color: colors.primary }]}>
                Create Verified Account / Sign In →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Universal Emergency Contacts & Helplines */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Emergency Responders & Guardians
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
                  {
                    backgroundColor: contact.isHelpline
                      ? 'rgba(239, 68, 68, 0.12)'
                      : colors.backgroundInput,
                  },
                ]}
              >
                <Text style={styles.contactIcon}>
                  {contact.isHelpline ? '🚨' : '👥'}
                </Text>
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
                style={[
                  styles.testBtn,
                  contact.isHelpline && styles.testBtnCall,
                ]}
                onPress={() => testAlert(contact)}
              >
                <Text
                  style={[
                    styles.testBtnText,
                    contact.isHelpline && { color: '#EF4444' },
                  ]}
                >
                  {contact.isHelpline ? 'Call' : 'Test'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Quick Settings Shortcut */}
        <TouchableOpacity
          style={[
            styles.settingsShortcutCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsShortcutEmoji}>⚙️</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.settingsShortcutTitle,
                { color: colors.textPrimary },
              ]}
            >
              App Preferences & Security Settings
            </Text>
            <Text
              style={[
                styles.settingsShortcutDesc,
                { color: colors.textSecondary },
              ]}
            >
              Vibration, Siren SOS, Push notifications, Theme switcher & Cache
            </Text>
          </View>
          <Text
            style={[styles.settingsShortcutArrow, { color: colors.textMuted }]}
          >
            ›
          </Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundCard,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  settingsIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconEmoji: { fontSize: 20 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  userEmail: { fontSize: 12, marginBottom: 4 },
  userPhoneText: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  guestBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  memberBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#F8FAFC' },
  editBtn: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  editBtnText: { fontSize: 11, fontWeight: '700' },
  medicalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicalTitle: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  medicalActionText: { fontSize: 12, fontWeight: '700' },
  medicalContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bloodChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  bloodChipText: { color: '#EF4444', fontSize: 11, fontWeight: '800' },
  medicalNotes: { flex: 1, fontSize: 11 },
  guestWarningCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  guestWarningTitle: { color: '#F59E0B', fontSize: 13, fontWeight: '800' },
  guestWarningDesc: { fontSize: 11, lineHeight: 16 },
  guestSwitchBtn: { marginTop: 4 },
  guestSwitchText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  addBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  contactsList: { gap: 10 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: { fontSize: 18 },
  contactDetails: { flex: 1 },
  contactName: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  contactRel: { fontSize: 10, marginBottom: 2 },
  contactPhone: { fontSize: 11, fontWeight: '600' },
  testBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  testBtnCall: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  testBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  settingsShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  settingsShortcutEmoji: { fontSize: 22 },
  settingsShortcutTitle: { fontSize: 13, fontWeight: '800' },
  settingsShortcutDesc: { fontSize: 10, marginTop: 2 },
  settingsShortcutArrow: { fontSize: 18, fontWeight: '800' },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
});
