import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore, SavedProfile } from '../store/authStore';

interface AccountSelectScreenProps {
  navigation: any;
}

export const AccountSelectScreen: React.FC<AccountSelectScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  );
  const { colors, isDark } = useTheme();
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
      initialTab: 'login',
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

  const hasSavedProfiles = savedProfiles && savedProfiles.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header Section */}
      <View style={[styles.headerSection, { paddingTop: topInset + 30 }]}>
        <View
          style={[
            styles.logoShieldCircle,
            { backgroundColor: colors.primaryDark },
          ]}
        >
          <Feather name="shield" size={40} color="#FFFFFF" />
        </View>

        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
          SAFORA
        </Text>
        <Text style={[styles.headingText, { color: colors.textPrimary }]}>
          Who is using SAFORA?
        </Text>
        <Text
          style={[
            styles.subheadingText,
            { color: isDark ? '#A3A7C8' : colors.textSecondary },
          ]}
        >
          Select a profile or start in guest mode
        </Text>
      </View>

      {/* Profiles Grid / Row */}
      <ScrollView
        contentContainerStyle={styles.profilesScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profilesRow}>
          {/* Saved Profiles (Screen 7) */}
          {hasSavedProfiles &&
            savedProfiles.map(profile => {
              const initial = (profile.name || 'U').charAt(0).toUpperCase();
              return (
                <View key={String(profile.id)} style={styles.profileCol}>
                  <TouchableOpacity
                    style={[
                      styles.savedAvatarCircle,
                      { backgroundColor: colors.primaryDark },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectProfile(profile)}
                    onLongPress={() => handleConfirmDelete(profile)}
                  >
                    <Text style={styles.avatarInitial}>{initial}</Text>
                    <TouchableOpacity
                      style={styles.deleteBadge}
                      onPress={() => handleConfirmDelete(profile)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={11} color="#FFFFFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <Text
                    style={[styles.profileName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {profile.name}
                  </Text>
                  <Text
                    style={[
                      styles.profileRole,
                      { color: isDark ? '#A3A7C8' : colors.textSecondary },
                    ]}
                  >
                    Saved account
                  </Text>
                </View>
              );
            })}

          {/* Guest Mode Circle */}
          <View style={styles.profileCol}>
            <TouchableOpacity
              style={[
                styles.guestAvatarCircle,
                {
                  backgroundColor: isDark
                    ? 'rgba(139, 137, 255, 0.17)'
                    : '#ECE9FA',
                },
              ]}
              activeOpacity={0.8}
              onPress={handleEnterGuest}
            >
              <Feather
                name="user"
                size={34}
                color={isDark ? '#B4B2FF' : colors.primaryDark}
              />
            </TouchableOpacity>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              Guest
            </Text>
            <Text
              style={[
                styles.profileRole,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              Explore mode
            </Text>
          </View>

          {/* Sign In / Switch Account Circle */}
          <View style={styles.profileCol}>
            <TouchableOpacity
              style={[
                styles.addAvatarCircle,
                {
                  borderColor: isDark ? '#6F6DC8' : colors.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('Auth', { initialTab: 'login' })
              }
            >
              <Text
                style={[
                  styles.plusSign,
                  { color: isDark ? '#B4B2FF' : colors.primary },
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {hasSavedProfiles ? 'Switch / Add' : 'Sign in'}
            </Text>
            <Text
              style={[
                styles.profileRole,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              {hasSavedProfiles ? 'New account' : 'Login or sign up'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Disclaimer and Tour Action */}
      <View
        style={[
          styles.footerSection,
          { paddingBottom: Math.max(insets.bottom, 24) + 12 },
        ]}
      >
        <Text
          style={[
            styles.guestDisclaimer,
            { color: isDark ? '#8387AB' : colors.textMuted },
          ]}
        >
          Guest mode has limited features. Sign in to use SOS alerts and
          guardians.
        </Text>

        <TouchableOpacity
          style={[
            styles.tourButton,
            {
              backgroundColor: isDark
                ? 'rgba(75, 73, 168, 0.12)'
                : 'rgba(92, 90, 200, 0.08)',
              borderColor: isDark
                ? 'rgba(75, 73, 168, 0.35)'
                : 'rgba(92, 90, 200, 0.25)',
            },
          ]}
          onPress={() => navigation.navigate('Onboarding')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tourButtonText,
              { color: isDark ? '#B4B2FF' : colors.primaryDark },
            ]}
          >
            View app tour and safety features →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoShieldCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B49A8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 8,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  headingText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  profilesScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  profilesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingHorizontal: 20,
  },
  profileCol: {
    alignItems: 'center',
    width: 90,
  },
  savedAvatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B49A8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 8,
    position: 'relative',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  deleteBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C0344A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0D20',
  },
  guestAvatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addAvatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  plusSign: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  footerSection: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  guestDisclaimer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
    fontWeight: '500',
  },
  tourButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
