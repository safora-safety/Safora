import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
  Linking,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SosService } from '../services/sosService';
import { SosNotification } from '@safora/shared-types';

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const statusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
  const headerTopPadding = Math.max(insets.top, statusBarHeight) + 12;

  const [notifications, setNotifications] = useState<SosNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Audio playback simulator state
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const playbackTimerRef = useRef<any>(null);
  const waveAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    loadNotifications();
  }, []);

  // Animate audio waveform bars when playing
  useEffect(() => {
    if (playingId !== null) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      waveAnim.setValue(0.4);
    }
  }, [playingId, waveAnim]);

  const loadNotifications = async () => {
    try {
      const data = await SosService.getNotifications();
      setNotifications(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: string | number) => {
    await SosService.markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await SosService.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Toggle 30s audio evidence playback
  const togglePlayAudio = (id: string | number) => {
    if (playingId === id) {
      clearInterval(playbackTimerRef.current);
      setPlayingId(null);
      setPlaybackSeconds(0);
      return;
    }

    clearInterval(playbackTimerRef.current);
    setPlayingId(id);
    setPlaybackSeconds(0);

    playbackTimerRef.current = setInterval(() => {
      setPlaybackSeconds(prev => {
        if (prev >= 30) {
          clearInterval(playbackTimerRef.current);
          setPlayingId(null);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const openInMap = (lat: number, lng: number) => {
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const callSender = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationCard = ({ item }: { item: SosNotification }) => {
    const isPlaying = playingId === item.id;
    const isEmergency = item.type === 'sos_alert' && !item.isTest;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: !item.isRead
              ? isEmergency
                ? '#EF4444'
                : '#38BDF8'
              : colors.border,
          },
        ]}
        activeOpacity={0.9}
        onPress={() => handleMarkAsRead(item.id)}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.badgeType,
                {
                  backgroundColor: isEmergency
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(56, 189, 248, 0.15)',
                  borderColor: isEmergency ? '#EF4444' : '#38BDF8',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeTypeText,
                  { color: isEmergency ? '#EF4444' : '#38BDF8' },
                ]}
              >
                {isEmergency ? '🚨 EMERGENCY SOS' : '🔔 TEST DRILL'}
              </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Sender Info & Title */}
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {item.body}
        </Text>

        {/* Live Metrics Row (Battery + Coordinates) */}
        <View style={styles.metricsRow}>
          {item.latitude !== 0 && item.longitude !== 0 && (
            <TouchableOpacity
              style={[
                styles.metricPill,
                { backgroundColor: colors.backgroundInput },
              ]}
              onPress={() => openInMap(item.latitude, item.longitude)}
            >
              <Text style={styles.metricEmoji}>📍</Text>
              <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
              </Text>
            </TouchableOpacity>
          )}

          {item.batteryPercentage !== undefined && (
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.backgroundInput },
              ]}
            >
              <Text style={styles.metricEmoji}>
                {item.batteryPercentage <= 20 ? '🪫' : '🔋'}
              </Text>
              <Text
                style={[
                  styles.metricText,
                  {
                    color:
                      item.batteryPercentage <= 20
                        ? '#EF4444'
                        : colors.textPrimary,
                  },
                ]}
              >
                {item.batteryPercentage}%
              </Text>
            </View>
          )}
        </View>

        {/* 30-Second Ambient Audio Evidence Player (for Real SOS) */}
        {isEmergency && (
          <View
            style={[
              styles.audioPlayerBox,
              {
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.6)'
                  : 'rgba(241, 245, 249, 0.8)',
                borderColor: isPlaying ? '#38BDF8' : colors.border,
              },
            ]}
          >
            <View style={styles.audioTopRow}>
              <View style={styles.audioLabelGroup}>
                <Text style={styles.micEmoji}>🎙️</Text>
                <Text
                  style={[styles.audioLabel, { color: colors.textPrimary }]}
                >
                  30s Live Ambient Audio Evidence
                </Text>
              </View>
              <Text style={[styles.durationText, { color: colors.textMuted }]}>
                {isPlaying
                  ? `0:${playbackSeconds < 10 ? '0' : ''}${playbackSeconds} / 0:30`
                  : '0:30'}
              </Text>
            </View>

            {/* Visualizer and Play Controls */}
            <View style={styles.audioControlRow}>
              <TouchableOpacity
                style={[
                  styles.playBtn,
                  { backgroundColor: isPlaying ? '#EF4444' : '#38BDF8' },
                ]}
                onPress={() => togglePlayAudio(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>

              {/* Animated Waveform Visualizer */}
              <View style={styles.waveformContainer}>
                {[
                  0.8, 1.4, 0.6, 1.8, 1.2, 0.5, 1.6, 1.0, 1.5, 0.7, 1.9, 1.1,
                  0.6, 1.4,
                ].map((h, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: 16 * h,
                        backgroundColor: isPlaying
                          ? i <= (playbackSeconds / 30) * 14
                            ? '#38BDF8'
                            : '#64748B'
                          : '#64748B',
                        transform: isPlaying
                          ? [
                              {
                                scaleY: waveAnim.interpolate({
                                  inputRange: [0.3, 1],
                                  outputRange: [0.4, h],
                                }),
                              },
                            ]
                          : [{ scaleY: 0.5 }],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons: Open Map & Direct Call */}
        <View style={styles.actionRow}>
          {item.latitude !== 0 && item.longitude !== 0 && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  borderColor: '#38BDF8',
                },
              ]}
              onPress={() => openInMap(item.latitude, item.longitude)}
            >
              <Text style={[styles.actionBtnText, { color: '#38BDF8' }]}>
                🗺️ Live Map
              </Text>
            </TouchableOpacity>
          )}

          {item.senderPhone && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: '#10B981',
                },
              ]}
              onPress={() => callSender(item.senderPhone)}
            >
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
                📞 Call {item.senderName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
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
            paddingTop: headerTopPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Safety Alerts Center
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCounterBadge}>
              <Text style={styles.unreadCounterText}>{unreadCount} New</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.markAllText, { color: colors.accent }]}>
              Read All
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>
            Checking safety notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={renderNotificationCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛡️</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                All Safe & Clear
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                No emergency SOS alerts or test drills received. When someone in
                your trusted circle triggers SOS, high-priority alerts with live
                GPS and 30s recorded audio will appear right here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  unreadCounterBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loaderArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeType: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeTypeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metricEmoji: {
    fontSize: 12,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
  },
  audioPlayerBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  audioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micEmoji: {
    fontSize: 14,
  },
  audioLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  audioControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 1,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    paddingHorizontal: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
