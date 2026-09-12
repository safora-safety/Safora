import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useAuthStore, SavedProfile } from '../store/authStore';
import { colors } from '../theme/colors';

interface AccountSelectScreenProps {
  navigation: any;
}

export const AccountSelectScreen: React.FC<AccountSelectScreenProps> = ({
  navigation,
}) => {
  const { savedProfiles, enterAsGuest, removeSavedProfile } = useAuthStore();

  const handleEnterGuest = async () => {
    await enterAsGuest();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleSelectProfile = (profile: SavedProfile) => {
    navigation.navigate('Auth', {
      prefillEmail: profile.email,
      prefillName: profile.name,
    });
  };

  const handleConfirmDelete = (profile: SavedProfile) => {
    Alert.alert(
      'Remove Account',
      `Remove ${profile.name} (${profile.email}) from this device's saved profiles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeSavedProfile(profile.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Ambient Top Glow Header */}
      <View style={styles.header}>
        <View style={styles.shieldGlow}>
          <Text style={styles.shieldEmoji}>🛡️</Text>
        </View>
        <Text style={styles.appTitle}>SAFORA</Text>
        <Text style={styles.tagline}>Who is using SAFORA?</Text>
        <Text style={styles.subTagline}>
          Select a profile or start in guest mode
        </Text>
      </View>

      {/* Center Profile Circles Grid (JioHotstar / Streaming Style) */}
      <ScrollView
        contentContainerStyle={styles.profilesGrid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.circlesRow}>
          {/* 1. Saved Accounts (If any exist) */}
          {savedProfiles.map(profile => {
            const initial = (profile.name || 'U').charAt(0).toUpperCase();
            return (
              <View key={String(profile.id)} style={styles.profileItem}>
                <TouchableOpacity
                  style={styles.avatarCircleActive}
                  activeOpacity={0.8}
                  onPress={() => handleSelectProfile(profile)}
                  onLongPress={() => handleConfirmDelete(profile)}
                >
                  <Text style={styles.avatarInitial}>{initial}</Text>
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => handleConfirmDelete(profile)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeBadgeText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Text style={styles.profileSub} numberOfLines={1}>
                  Saved Account
                </Text>
              </View>
            );
          })}

          {/* 2. Guest Mode Circle */}
          <View style={styles.profileItem}>
            <TouchableOpacity
              style={styles.avatarCircleGuest}
              activeOpacity={0.8}
              onPress={handleEnterGuest}
            >
              <Text style={styles.guestIcon}>👤</Text>
            </TouchableOpacity>
            <Text style={styles.profileName}>Guest</Text>
            <Text style={styles.profileSub}>Explore Mode</Text>
          </View>

          {/* 3. Add Account / Sign In Dotted Circle */}
          <View style={styles.profileItem}>
            <TouchableOpacity
              style={styles.avatarCircleAdd}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('Auth', { initialTab: 'login' })
              }
            >
              <Text style={styles.addPlusIcon}>+</Text>
            </TouchableOpacity>
            <Text style={styles.profileName}>
              {savedProfiles.length > 0 ? 'Switch / Add' : 'Sign In'}
            </Text>
            <Text style={styles.profileSub}>
              {savedProfiles.length > 0 ? 'New Account' : 'Login / Sign Up'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions & Tour Option */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.tourButton}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.8}
        >
          <Text style={styles.tourButtonText}>
            ✨ View App Tour & Safety Features →
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerCaption}>
          Universal Community Safety Network • Encrypted Coordinates
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
  },
  shieldGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(79, 70, 229, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  shieldEmoji: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subTagline: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  profilesGrid: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  circlesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    maxWidth: 340,
  },
  profileItem: {
    alignItems: 'center',
    width: 96,
  },
  avatarCircleActive: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#818CF8',
    marginBottom: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    position: 'relative',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  removeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  avatarCircleGuest: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#475569',
    marginBottom: 10,
  },
  guestIcon: {
    fontSize: 32,
  },
  avatarCircleAdd: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  addPlusIcon: {
    fontSize: 36,
    color: '#818CF8',
    fontWeight: '300',
    marginTop: -2,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  tourButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  tourButtonText: {
    color: '#A5B4FC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerCaption: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
});
