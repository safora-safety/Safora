import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  guardianSosService,
  GuardianSosState,
} from '../../services/guardianSosService';

export const GuardianSosLiveModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<GuardianSosState>(
    guardianSosService.getState(),
  );
  const [minimized, setMinimized] = useState(false);

  // Soundwave animation
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.7)).current;
  const waveAnim3 = useRef(new Animated.Value(0.4)).current;
  const waveAnim4 = useRef(new Animated.Value(0.9)).current;

  // Pulse animation for live beacon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    guardianSosService.initialize();
    const unsub = guardianSosService.subscribe(newState => {
      setState({ ...newState });
      if (newState.activeEmergency && minimized) {
        // Expand if new emergency comes in
        setMinimized(false);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Beacon pulse animation
  useEffect(() => {
    if (state.activeEmergency) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [state.activeEmergency, pulseAnim]);

  // Audio wave animation when chunk or master is playing
  const isAudioActive =
    (state.currentPlayingSeq !== null || state.isMasterPlaying) &&
    !state.isMuted;

  useEffect(() => {
    if (isAudioActive) {
      const animateWave = (anim: Animated.Value, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const a1 = animateWave(waveAnim1, 320);
      const a2 = animateWave(waveAnim2, 260);
      const a3 = animateWave(waveAnim3, 380);
      const a4 = animateWave(waveAnim4, 300);

      a1.start();
      a2.start();
      a3.start();
      a4.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        a4.stop();
      };
    } else {
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.3);
      waveAnim4.setValue(0.4);
    }
  }, [isAudioActive, waveAnim1, waveAnim2, waveAnim3, waveAnim4]);

  if (!state.activeEmergency) {
    return null;
  }

  const {
    activeEmergency,
    chunks,
    currentPlayingSeq,
    isMuted,
    isMasterPlaying,
    masterPlaybackSeconds,
  } = state;

  const openNavigation = () => {
    if (activeEmergency.latitude && activeEmergency.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${activeEmergency.latitude},${activeEmergency.longitude}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const callCompanion = () => {
    if (activeEmergency.userPhone) {
      Linking.openURL(
        `tel:${activeEmergency.userPhone.replace(/\s+/g, '')}`,
      ).catch(() => {});
    }
  };

  const callPolice = () => {
    Linking.openURL('tel:112').catch(() => {});
  };

  const latestSeq = chunks.length > 0 ? chunks[chunks.length - 1].seq : 1;
  const totalChunks = 6;

  // Minimized floating banner
  if (minimized) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setMinimized(false)}
        style={[
          styles.minimizedBanner,
          {
            top: insets.top + (Platform.OS === 'android' ? 12 : 8),
          },
        ]}
      >
        <Animated.View
          style={[styles.miniBeacon, { transform: [{ scale: pulseAnim }] }]}
        />
        <View style={styles.miniTextCol}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            🚨 SOS: {activeEmergency.userName || 'Companion'}
          </Text>
          <Text style={styles.miniSub}>
            {activeEmergency.audioUrl
              ? '30s Recording Ready • Tap to Expand'
              : `Live Audio Slice #${latestSeq}/6 Streaming • Tap to Expand`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => guardianSosService.toggleMute()}
          style={styles.miniMuteBtn}
        >
          <Text style={styles.miniMuteText}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.hudContainer,
            {
              paddingTop: Math.max(insets.top, 24) + 12,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.beaconBadge}>
              <Animated.View
                style={[
                  styles.beaconDot,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={styles.beaconText}>LIVE SOS TRANSMISSION</Text>
            </View>

            <TouchableOpacity
              onPress={() => setMinimized(true)}
              style={styles.minimizeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.minimizeBtnText}>Minimize ▾</Text>
            </TouchableOpacity>
          </View>

          {/* Ward Name & Status */}
          <View style={styles.wardCard}>
            <Text style={styles.wardEmoji}>🛡️</Text>
            <View style={styles.wardInfoCol}>
              <Text style={styles.wardName} numberOfLines={1}>
                {activeEmergency.userName || 'Person You Protect'}
              </Text>
              <Text style={styles.wardStatus}>
                Needs immediate assistance &bull;{' '}
                {activeEmergency.batteryPercentage !== undefined
                  ? `⚡ ${activeEmergency.batteryPercentage}% Battery`
                  : 'Safety Signal Active'}
              </Text>
            </View>
          </View>

          {/* Live Audio Streaming Console */}
          <View style={styles.streamConsole}>
            <View style={styles.streamHeaderRow}>
              <View style={styles.streamStatusCol}>
                <Text style={styles.streamTitle}>
                  {activeEmergency.audioUrl
                    ? '30s Master Evidence File Ready'
                    : 'Real-Time Ambient Audio Transmission'}
                </Text>
                <Text style={styles.streamSubtitle}>
                  {activeEmergency.audioUrl
                    ? 'Full verified archival audio stitched & uploaded'
                    : isMuted
                      ? 'Audio muted (tap Listen Live to hear ambient sounds)'
                      : `Streaming 5s slices (${chunks.length}/6 received)`}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.muteToggleBtn,
                  isMuted && styles.muteToggleBtnActive,
                ]}
                onPress={() => guardianSosService.toggleMute()}
              >
                <Text style={styles.muteToggleIcon}>
                  {isMuted ? '🔇' : '🔊'}
                </Text>
                <Text style={styles.muteToggleText}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Slices Indicators */}
            {!activeEmergency.audioUrl && (
              <View style={styles.slicesContainer}>
                {Array.from({ length: totalChunks }).map((_, idx) => {
                  const seqNum = idx + 1;
                  const isReceived = chunks.some(c => c.seq === seqNum);
                  const isPlaying = currentPlayingSeq === seqNum && !isMuted;

                  return (
                    <View
                      key={`slice-${seqNum}`}
                      style={[
                        styles.slicePill,
                        isReceived && styles.slicePillReceived,
                        isPlaying && styles.slicePillPlaying,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slicePillText,
                          isReceived && styles.slicePillTextReceived,
                          isPlaying && styles.slicePillTextPlaying,
                        ]}
                      >
                        #{seqNum}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Visualizer & Waveform Bars */}
            <View style={styles.waveformContainer}>
              <View style={styles.waveGroup}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    { transform: [{ scaleY: waveAnim1 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    { transform: [{ scaleY: waveAnim2 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    { transform: [{ scaleY: waveAnim3 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    { transform: [{ scaleY: waveAnim4 }] },
                  ]}
                />
              </View>
              <Text style={styles.waveformStatusText}>
                {isAudioActive
                  ? isMasterPlaying
                    ? `Playing Master Audio (${masterPlaybackSeconds}s / 30s)`
                    : `Streaming Live Slice #${currentPlayingSeq || latestSeq}`
                  : isMuted
                    ? 'Audio Muted'
                    : 'Buffering Next Audio Transmission...'}
              </Text>
            </View>

            {/* Master Audio Play/Pause Button if master is available */}
            {activeEmergency.audioUrl && (
              <TouchableOpacity
                style={styles.masterPlayBtn}
                onPress={() => {
                  if (isMasterPlaying) {
                    guardianSosService.stopMasterAudio();
                  } else {
                    guardianSosService.playMasterAudio();
                  }
                }}
              >
                <Text style={styles.masterPlayIcon}>
                  {isMasterPlaying ? '⏸️' : '▶️'}
                </Text>
                <Text style={styles.masterPlayText}>
                  {isMasterPlaying
                    ? `Pause Master Audio (${masterPlaybackSeconds}s / 30s)`
                    : 'Play Full 30s Master Audio'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={openNavigation}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>📍</Text>
              <View style={styles.actionBtnTextCol}>
                <Text style={styles.primaryActionText}>
                  Navigate to Live Location
                </Text>
                <Text style={styles.primaryActionSub}>
                  {activeEmergency.latitude
                    ? `${activeEmergency.latitude.toFixed(4)}, ${activeEmergency.longitude.toFixed(4)}`
                    : 'Open GPS Maps'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              {Boolean(activeEmergency.userPhone) && (
                <TouchableOpacity
                  style={styles.callCompanionBtn}
                  onPress={callCompanion}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryBtnIcon}>📞</Text>
                  <Text style={styles.secondaryBtnText}>Call Companion</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.callPoliceBtn}
                onPress={callPolice}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnIcon}>🚓</Text>
                <Text style={styles.secondaryBtnText}>Call 112</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => guardianSosService.dismissEmergency()}
            >
              <Text style={styles.dismissBtnText}>Dismiss Emergency Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudContainer: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingHorizontal: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  beaconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  beaconText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  minimizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  minimizeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  wardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  wardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  wardInfoCol: {
    flex: 1,
  },
  wardName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  wardStatus: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  streamConsole: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  streamStatusCol: {
    flex: 1,
    marginRight: 8,
  },
  streamTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  streamSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  muteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  muteToggleBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  muteToggleIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  muteToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  slicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slicePill: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  slicePillReceived: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  slicePillPlaying: {
    backgroundColor: '#EF4444',
    borderColor: '#F87171',
  },
  slicePillText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  slicePillTextReceived: {
    color: '#34D399',
  },
  slicePillTextPlaying: {
    color: '#FFFFFF',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  waveGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginRight: 10,
  },
  waveBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginHorizontal: 1.5,
  },
  waveformStatusText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  masterPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  masterPlayIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  masterPlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  actionBtnIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  actionBtnTextCol: {
    flex: 1,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryActionSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callCompanionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 14,
  },
  callPoliceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryBtnIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 2,
  },
  dismissBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  // Minimized Floating Banner
  minimizedBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 9999,
  },
  miniBeacon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 10,
  },
  miniTextCol: {
    flex: 1,
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  miniSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  miniMuteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 8,
  },
  miniMuteText: {
    fontSize: 16,
  },
});
