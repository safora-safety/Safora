import React, { useState } from 'react';
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
import { useAuthStore } from '../store/authStore';

export const HomeScreen: React.FC = () => {
  const { user, isGuest, logout } = useAuthStore();
  const [sosTriggered, setSosTriggered] = useState(false);

  const handleSosPress = () => {
    setSosTriggered(true);
    Alert.alert(
      '🚨 SOS ALERT TRIGGERED',
      'Emergency broadcast sent! Your live coordinates (30.3165°N, 78.0322°E) are being transmitted to trusted contacts & nearest responders.',
      [{ text: 'Dismiss SOS', onPress: () => setSosTriggered(false) }],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.beaconDot} />
          <Text style={styles.brandTitle}>SAFORA</Text>
        </View>

        <View style={styles.userActions}>
          <View
            style={[
              styles.badge,
              isGuest ? styles.guestBadge : styles.memberBadge,
            ]}
          >
            <Text style={styles.badgeText}>
              {isGuest
                ? '👤 GUEST'
                : `🛡️ ${user?.name?.split(' ')[0] || 'MEMBER'}`}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>
              {isGuest ? 'Sign In' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Guest Banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <View style={styles.guestBannerHeader}>
              <Text style={styles.guestBannerTitle}>Guest Preview Mode</Text>
              <Text style={styles.guestBannerTag}>DEMO</Text>
            </View>
            <Text style={styles.guestBannerDesc}>
              You can explore the safety grid & simulated hazards. Sign in to
              save custom contacts & submit verified reports.
            </Text>
          </View>
        )}

        {/* Big SOS Emergency Action */}
        <View style={styles.sosCard}>
          <Text style={styles.sosHeading}>EMERGENCY ASSISTANCE</Text>
          <Text style={styles.sosSubheading}>One-touch instant broadcast</Text>

          <TouchableOpacity
            style={[styles.sosButton, sosTriggered && styles.sosButtonActive]}
            activeOpacity={0.8}
            onPress={handleSosPress}
          >
            <Text style={styles.sosButtonText}>SOS</Text>
            <Text style={styles.sosButtonSubtext}>TAP FOR HELP</Text>
          </TouchableOpacity>

          <Text style={styles.sosFooterNote}>
            Broadcasting to Dehradun Safety Grid (Campus & City)
          </Text>
        </View>

        {/* Core Services Grid */}
        <Text style={styles.sectionTitle}>Safety Services</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() =>
              Alert.alert(
                'Safe Walk',
                'Safe Walk route guidance simulation initiated. Tracking movement...',
              )
            }
          >
            <Text style={styles.cardEmoji}>🚶‍♀️</Text>
            <Text style={styles.cardTitle}>Safe Walk</Text>
            <Text style={styles.cardDesc}>Escort & virtual guardian timer</Text>
            <Text style={styles.cardAction}>Start Walk →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() =>
              Alert.alert('Report Hazard', 'Pinning hazard on PostGIS grid...')
            }
          >
            <Text style={styles.cardEmoji}>⚠️</Text>
            <Text style={styles.cardTitle}>Report Hazard</Text>
            <Text style={styles.cardDesc}>
              Submit pin with photo & severity
            </Text>
            <Text style={styles.cardAction}>New Report →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() =>
              Alert.alert(
                'Safety Heatmap',
                'Loading MapTiler vector tiles + PostGIS risk layer...',
              )
            }
          >
            <Text style={styles.cardEmoji}>🗺️</Text>
            <Text style={styles.cardTitle}>Live Heatmap</Text>
            <Text style={styles.cardDesc}>Visual safety scores & clusters</Text>
            <Text style={styles.cardAction}>View Map →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() =>
              Alert.alert(
                'Trusted Contacts',
                'Manage emergency SMS and push alerts.',
              )
            }
          >
            <Text style={styles.cardEmoji}>📞</Text>
            <Text style={styles.cardTitle}>SOS Contacts</Text>
            <Text style={styles.cardDesc}>
              Family & campus security dispatch
            </Text>
            <Text style={styles.cardAction}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {/* Nearby Hazards Sample Feed */}
        <Text style={styles.sectionTitle}>
          Nearby Hazard Reports (PostGIS Grid)
        </Text>
        <View style={styles.hazardsFeed}>
          <View style={styles.hazardItem}>
            <View
              style={[
                styles.hazardIndicator,
                { backgroundColor: colors.warning },
              ]}
            />
            <View style={styles.hazardInfo}>
              <Text style={styles.hazardItemTitle}>Poor Street Lighting</Text>
              <Text style={styles.hazardLocation}>
                Chakrata Road • 250m away
              </Text>
            </View>
            <View style={styles.severityBadge}>
              <Text style={styles.severityText}>SEV 3</Text>
            </View>
          </View>

          <View style={styles.hazardItem}>
            <View
              style={[
                styles.hazardIndicator,
                { backgroundColor: colors.danger },
              ]}
            />
            <View style={styles.hazardInfo}>
              <Text style={styles.hazardItemTitle}>Open Construction Pit</Text>
              <Text style={styles.hazardLocation}>
                Manduwala Gate • 600m away
              </Text>
            </View>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
              ]}
            >
              <Text style={[styles.severityText, { color: colors.danger }]}>
                SEV 5
              </Text>
            </View>
          </View>

          <View style={styles.hazardItem}>
            <View
              style={[styles.hazardIndicator, { backgroundColor: colors.info }]}
            />
            <View style={styles.hazardInfo}>
              <Text style={styles.hazardItemTitle}>Waterlogged Underpass</Text>
              <Text style={styles.hazardLocation}>
                Prem Nagar Market • 1.2km away
              </Text>
            </View>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
              ]}
            >
              <Text style={[styles.severityText, { color: colors.info }]}>
                SEV 2
              </Text>
            </View>
          </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  beaconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  guestBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  memberBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  guestBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  guestBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  guestBannerTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  guestBannerTag: {
    backgroundColor: colors.warning,
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  guestBannerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sosCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sosHeading: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sosSubheading: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 16,
  },
  sosButtonActive: {
    backgroundColor: colors.dangerDark,
    transform: [{ scale: 0.96 }],
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sosFooterNote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardAction: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  hazardsFeed: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  hazardIndicator: {
    width: 6,
    height: 36,
    borderRadius: 3,
    marginRight: 12,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardItemTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  hazardLocation: {
    color: colors.textMuted,
    fontSize: 11,
  },
  severityBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  severityText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
  },
});
