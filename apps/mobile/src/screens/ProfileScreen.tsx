import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { EditProfileModal } from '../components/EditProfileModal';
import { ContactModal, EditableContact } from '../components/ContactModal';
import { useTheme } from '../theme/ThemeContext';

import { SosService } from '../services/sosService';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  hasSaforaAccount?: boolean;
  isHelpline?: boolean;
}

const DEFAULT_HELPLINES: Contact[] = [
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
];

const INITIAL_FAMILY_CONTACTS: Contact[] = [
  {
    id: 'family-1',
    name: 'Emergency Guardian (Family)',
    relationship: 'Parent / Primary Guardian',
    phone: '+91 98765 43210',
    email: 'guardian@gmail.com',
    isHelpline: false,
  },
];

const CONTACTS_STORAGE_KEY = '@safora_custom_emergency_contacts';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isGuest, logout } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EditableContact | null>(
    null,
  );
  const [customContacts, setCustomContacts] = useState<Contact[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // Monitor unread safety notifications for bell counter badge
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const notifs = await SosService.getNotifications();
        const unread = notifs.filter(n => !n.isRead).length;
        setUnreadNotifications(unread);
      } catch {}
    };
    fetchUnread();
    const unsub = navigation.addListener('focus', fetchUnread);
    return unsub;
  }, [navigation]);
  const [isContactsLoaded, setIsContactsLoaded] = useState(false);

  // Load custom contacts from persistent storage and sync from database
  useEffect(() => {
    const loadAndSyncContacts = async () => {
      try {
        const stored = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomContacts(parsed);
          }
        } else {
          // First-time fresh install: provide sample contact
          setCustomContacts(INITIAL_FAMILY_CONTACTS);
        }
      } catch {
        setCustomContacts(INITIAL_FAMILY_CONTACTS);
      } finally {
        setIsContactsLoaded(true);
      }

      // If logged in, sync with PostgreSQL database
      if (!isGuest && user) {
        try {
          const dbContacts = await SosService.getContacts();
          const userOnly = dbContacts.filter(
            c =>
              !String(c.id).startsWith('police-') &&
              !String(c.id).startsWith('ambulance-'),
          );
          if (userOnly.length > 0) {
            const mapped: Contact[] = userOnly.map(c => ({
              id: String(c.id),
              name: c.name,
              phone: c.phone,
              relationship: c.relationship || 'Guardian',
              isHelpline: false,
            }));
            setCustomContacts(mapped);
            await AsyncStorage.setItem(
              CONTACTS_STORAGE_KEY,
              JSON.stringify(mapped),
            );
          }
        } catch {
          // Keep local list if offline
        }
      }
    };

    loadAndSyncContacts();
  }, [user, isGuest]);

  const saveCustomContacts = async (updated: Contact[]) => {
    setCustomContacts(updated);
    try {
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  };

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setShowContactModal(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactModal(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert(
      'Delete Emergency Contact',
      `Are you sure you want to permanently delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Update local state and AsyncStorage immediately
            const updated = customContacts.filter(c => c.id !== contact.id);
            await saveCustomContacts(updated);

            // If real contact exists in DB, delete from PostgreSQL database
            if (
              !isGuest &&
              user &&
              !contact.id.startsWith('family-') &&
              !contact.id.startsWith('custom-')
            ) {
              try {
                await SosService.deleteContact(contact.id);
              } catch {
                // Handled gracefully
              }
            }

            Alert.alert(
              'Contact Removed',
              `${contact.name} was permanently removed.`,
            );
          },
        },
      ],
    );
  };

  const handleSaveContact = async (savedData: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    relationship: string;
  }) => {
    let hasAccount = false;
    if (savedData.email) {
      const checkRes = await SosService.checkGuardian(savedData.email);
      hasAccount = checkRes.exists;
    }

    if (savedData.id) {
      // Edit existing
      const updated = customContacts.map(c =>
        c.id === savedData.id
          ? {
              ...c,
              name: savedData.name,
              phone: savedData.phone,
              email: savedData.email,
              hasSaforaAccount: hasAccount,
              relationship: savedData.relationship,
            }
          : c,
      );
      await saveCustomContacts(updated);
      Alert.alert(
        'Contact Updated',
        `${savedData.name}'s details have been saved.`,
      );
    } else {
      // Add new contact - save to PostgreSQL database if logged in
      let assignedId = `custom-${Date.now()}`;
      if (!isGuest && user) {
        try {
          const dbContact = await SosService.addContact({
            name: savedData.name,
            phone: savedData.phone,
            email: savedData.email,
            relationship: savedData.relationship,
          });
          if (dbContact && dbContact.id) {
            assignedId = String(dbContact.id);
            if (dbContact.hasSaforaAccount !== undefined) {
              hasAccount = dbContact.hasSaforaAccount;
            }
          }
        } catch {
          // Fallback to local ID
        }
      }

      const newContact: Contact = {
        id: assignedId,
        name: savedData.name,
        phone: savedData.phone,
        email: savedData.email,
        hasSaforaAccount: hasAccount,
        relationship: savedData.relationship,
        isHelpline: false,
      };
      const updated = [...customContacts, newContact];
      await saveCustomContacts(updated);
      Alert.alert(
        'Guardian Added',
        `${savedData.name} has been added to your emergency network.${
          hasAccount
            ? '\n\n🟢 Guardian is registered on Safora! In-app push alerts & 30s live audio enabled.'
            : '\n\n📱 Guardian will receive direct cellular SMS alerts.'
        }`,
      );
    }
  };

  const testAlert = async (contact: Contact) => {
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

    if (contact.email) {
      try {
        const res = await SosService.testGuardian({
          contactId: contact.id,
          email: contact.email,
        });

        Alert.alert(
          res.deliveredToApp
            ? '🔔 Safety Drill Dispatched'
            : '📱 Cellular SMS Test',
          res.message,
          [{ text: 'OK' }],
        );
        return;
      } catch {
        // Fallback to simulation
      }
    }

    Alert.alert(
      '🚨 Test Alert Dispatched',
      `Simulated live SOS SMS alert to ${contact.name} (${contact.phone}):\n\n"EMERGENCY ALERT: Safora user triggered SOS. Live coordinates: 30.3165°N, 78.0322°E."`,
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

        {/* Header Action Buttons: Notifications Bell & Settings */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Notification Bell Button */}
          <TouchableOpacity
            style={[
              styles.settingsIconBtn,
              {
                backgroundColor: colors.backgroundInput,
                borderColor:
                  unreadNotifications > 0 ? '#EF4444' : colors.border,
                position: 'relative',
              },
            ]}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsIconEmoji}>🔔</Text>
            {unreadNotifications > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

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

        {/* Custom Emergency Family & Friends Contacts */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Family & Personal Guardians
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Will receive instant SOS calls, live GPS, and audio evidence
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenAddModal}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ Add Real Contact</Text>
          </TouchableOpacity>
        </View>

        {customContacts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Personal Guardians Added Yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add trusted family members or friends who should be notified when
              you trigger SOS or Safe Walk alerts.
            </Text>
            <TouchableOpacity
              style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
              onPress={handleOpenAddModal}
            >
              <Text style={styles.addFirstBtnText}>+ Add First Guardian</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {customContacts.map(contact => (
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
                    { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
                  ]}
                >
                  <Text style={styles.contactIcon}>👥</Text>
                </View>

                <View style={styles.contactDetails}>
                  <Text
                    style={[styles.contactName, { color: colors.textPrimary }]}
                  >
                    {contact.name}
                  </Text>
                  <Text
                    style={[styles.contactRel, { color: colors.textMuted }]}
                  >
                    {contact.relationship}
                  </Text>
                  <Text
                    style={[styles.contactPhone, { color: colors.primary }]}
                  >
                    {contact.phone}
                  </Text>
                  {contact.email ? (
                    <Text
                      style={[
                        styles.contactEmail,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ✉️ {contact.email}
                    </Text>
                  ) : null}

                  {/* Safora App Registration Status Badge */}
                  <View style={styles.badgeRow}>
                    {contact.hasSaforaAccount ? (
                      <View style={styles.badgeSaforaActive}>
                        <Text style={styles.badgeSaforaActiveText}>
                          🟢 Safora Member (Push + 30s Audio)
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.badgeSmsOnly}>
                        <Text style={styles.badgeSmsOnlyText}>
                          📱 Direct Cellular SMS
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Edit, Delete & Test Actions */}
                <View style={styles.contactActionsCol}>
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => handleOpenEditModal(contact)}
                  >
                    <Text style={styles.actionPillText}>✏️ Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionPill, styles.deletePill]}
                    onPress={() => handleDeleteContact(contact)}
                  >
                    <Text style={[styles.actionPillText, { color: '#EF4444' }]}>
                      🗑️ Delete
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.testBtn,
                      contact.hasSaforaAccount && styles.testBtnSafora,
                    ]}
                    onPress={() => testAlert(contact)}
                  >
                    <Text
                      style={[
                        styles.testBtnText,
                        contact.hasSaforaAccount && styles.testBtnSaforaText,
                      ]}
                    >
                      {contact.hasSaforaAccount ? '🔔 Test Drill' : 'Test SOS'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pinned Universal National Helplines */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Universal Emergency Services
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Verified 24/7 national citizen helplines
            </Text>
          </View>
        </View>

        <View style={styles.contactsList}>
          {DEFAULT_HELPLINES.map(helpline => (
            <View
              key={helpline.id}
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
                  { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                ]}
              >
                <Text style={styles.contactIcon}>🚨</Text>
              </View>

              <View style={styles.contactDetails}>
                <Text
                  style={[styles.contactName, { color: colors.textPrimary }]}
                >
                  {helpline.name}
                </Text>
                <Text style={[styles.contactRel, { color: colors.textMuted }]}>
                  {helpline.relationship}
                </Text>
                <Text style={[styles.contactPhone, { color: '#EF4444' }]}>
                  Dial {helpline.phone}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.testBtn, styles.testBtnCall]}
                onPress={() => testAlert(helpline)}
              >
                <Text style={[styles.testBtnText, { color: '#EF4444' }]}>
                  📞 Call
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
              Vibration, Siren SOS, Offline map cache, Theme switcher
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

      {/* Add / Edit Real Emergency Contact Modal */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={handleSaveContact}
        initialData={editingContact}
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
  sectionSub: { fontSize: 11, marginTop: 1 },
  addBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '800' },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  addFirstBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  addFirstBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  contactsList: { gap: 10 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  contactDetails: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  contactRel: { fontSize: 11, marginBottom: 3 },
  contactPhone: { fontSize: 12, fontWeight: '700' },
  contactEmail: { fontSize: 11, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  badgeSaforaActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeSaforaActiveText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
  badgeSmsOnly: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeSmsOnlyText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
  },
  contactActionsCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  actionPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  deletePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionPillText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  testBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  testBtnSafora: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  testBtnSaforaText: {
    color: '#10B981',
  },
  testBtnCall: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  testBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
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
