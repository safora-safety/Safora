import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  FakeCallService,
  FakeCallLanguage,
} from '../../services/FakeCallService';
import { typography } from '../../theme/typography';

interface FakeCallModalProps {
  visible: boolean;
  onClose: () => void;
  callerName?: string;
  callerNumber?: string;
}

export const FakeCallModal: React.FC<FakeCallModalProps> = ({
  visible,
  onClose,
  callerName = 'Mom 🏠',
  callerNumber = '+91 98765 43210',
}) => {
  const [callState, setCallState] = useState<'incoming' | 'connected'>(
    'incoming',
  );
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [language, setLanguage] = useState<FakeCallLanguage>('en');

  // Load language preference
  useEffect(() => {
    FakeCallService.getPreferredLanguage().then(setLanguage);
  }, [visible]);

  // Vibration pattern while ringing
  useEffect(() => {
    if (visible && callState === 'incoming') {
      Vibration.vibrate([500, 1000, 500, 1000], true);
    } else {
      Vibration.cancel();
    }
    return () => {
      Vibration.cancel();
      FakeCallService.stopFakeCallAudio();
    };
  }, [visible, callState]);

  // Call timer when connected
  useEffect(() => {
    let interval: any;
    if (visible && callState === 'connected') {
      interval = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, callState]);

  // Reset on open/close
  useEffect(() => {
    if (visible) {
      setCallState('incoming');
      setCallSeconds(0);
      setIsMuted(false);
    } else {
      Vibration.cancel();
      FakeCallService.stopFakeCallAudio();
    }
  }, [visible]);

  const handleAccept = () => {
    Vibration.cancel();
    setCallState('connected');
    FakeCallService.startFakeCallAudio(language, isSpeaker);
  };

  const handleDecline = () => {
    Vibration.cancel();
    FakeCallService.stopFakeCallAudio();
    onClose();
  };

  const toggleSpeaker = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (callState === 'connected') {
      FakeCallService.startFakeCallAudio(language, next);
    }
  };

  const selectLanguage = (lang: FakeCallLanguage) => {
    setLanguage(lang);
    FakeCallService.setPreferredLanguage(lang);
    if (callState === 'connected') {
      FakeCallService.startFakeCallAudio(lang, isSpeaker);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {callState === 'incoming' ? (
          <View style={styles.incomingView}>
            {/* Top caller info */}
            <View style={styles.callerHeader}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarInitials}>
                  {callerName.charAt(0)}
                </Text>
              </View>
              <Text style={styles.callerNameText}>{callerName}</Text>
              <Text style={styles.callerNumberText}>{callerNumber}</Text>
              <Text style={styles.callTypeText}>Incoming Cellular Call...</Text>
            </View>

            {/* Voice Script Language Selector */}
            <View style={styles.langSelectorRow}>
              <Text style={styles.langSelectorLabel}>
                Voice Dialogue Script:
              </Text>
              <View style={styles.langPillContainer}>
                <TouchableOpacity
                  style={[
                    styles.langPill,
                    language === 'en' && styles.langPillActive,
                  ]}
                  onPress={() => selectLanguage('en')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'en' && styles.langPillTextActive,
                    ]}
                  >
                    🇺🇸 English
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.langPill,
                    language === 'hi' && styles.langPillActive,
                  ]}
                  onPress={() => selectLanguage('hi')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      language === 'hi' && styles.langPillTextActive,
                    ]}
                  >
                    🇮🇳 Hindi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions Note */}
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Tap Accept to simulate a real conversation and exit safely.
              </Text>
            </View>

            {/* Accept / Decline Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={handleDecline}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Decline incoming call"
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={handleAccept}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Accept incoming call"
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.connectedView}>
            {/* In call header */}
            <View style={styles.callerHeader}>
              <View style={[styles.avatarLarge, styles.connectedAvatar]}>
                <Text style={styles.avatarInitials}>
                  {callerName.charAt(0)}
                </Text>
              </View>
              <Text style={styles.callerNameText}>{callerName}</Text>
              <Text style={[styles.connectedDuration, typography.tabularNums]}>
                {formatDuration(callSeconds)}
              </Text>
              <Text style={styles.connectedLangBadge}>
                {language === 'hi' ? '🇮🇳 Hindi Script' : '🇺🇸 English Script'} •{' '}
                {isSpeaker ? '🔊 Speakerphone' : '👂 Earpiece Mode'}
              </Text>

              {/* Conversational Escape Teleprompter Script */}
              <View style={styles.teleprompterCard}>
                <Text style={styles.teleprompterTitle}>
                  {language === 'hi'
                    ? '🗣️ बात करने का सुझाव (Say this out loud):'
                    : '🗣️ Suggested Natural Reply:'}
                </Text>
                <Text style={styles.teleprompterScript}>
                  {language === 'hi'
                    ? callSeconds < 10
                      ? '"हाँ, मैं बाहर ही आ रहा हूँ, बस दो मिनट में गेट पर मिलता हूँ!"'
                      : '"गाड़ी स्टार्ट रखो, मैं बस अभी बाहर निकल रहा हूँ!"'
                    : callSeconds < 10
                      ? '"Hey, yeah! I am heading outside right now, see you in two minutes."'
                      : '"Keep the engine running, I\'m walking out the front doors now!"'}
                </Text>
              </View>
            </View>

            {/* In-call controls grid */}
            <View style={styles.inCallGrid}>
              <TouchableOpacity
                style={[styles.gridBtn, isMuted && styles.gridBtnActive]}
                onPress={() => setIsMuted(!isMuted)}
              >
                <Text style={styles.gridBtnEmoji}>🎤</Text>
                <Text style={styles.gridBtnLabel}>
                  {isMuted ? 'Muted' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn}>
                <Text style={styles.gridBtnEmoji}>⌨️</Text>
                <Text style={styles.gridBtnLabel}>Keypad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gridBtn, isSpeaker && styles.gridBtnActive]}
                onPress={toggleSpeaker}
              >
                <Text style={styles.gridBtnEmoji}>
                  {isSpeaker ? '🔊' : '👂'}
                </Text>
                <Text style={styles.gridBtnLabel}>
                  {isSpeaker ? 'Speaker On' : 'Earpiece'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridBtn}
                onPress={() => selectLanguage(language === 'en' ? 'hi' : 'en')}
              >
                <Text style={styles.gridBtnEmoji}>
                  {language === 'hi' ? '🇮🇳' : '🇺🇸'}
                </Text>
                <Text style={styles.gridBtnLabel}>
                  {language === 'hi' ? 'Hindi' : 'English'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn}>
                <Text style={styles.gridBtnEmoji}>📹</Text>
                <Text style={styles.gridBtnLabel}>FaceTime</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn}>
                <Text style={styles.gridBtnEmoji}>👤</Text>
                <Text style={styles.gridBtnLabel}>Contacts</Text>
              </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <View style={styles.endCallWrapper}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.declineBtn,
                  { width: 76, height: 76 },
                ]}
                onPress={handleDecline}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.btnIcon,
                    { transform: [{ rotate: '135deg' }] },
                  ]}
                >
                  📞
                </Text>
                <Text style={styles.btnLabel}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  incomingView: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  connectedView: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  callerHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedAvatar: {
    borderColor: '#10B981',
  },
  avatarInitials: {
    fontSize: 38,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  callerNameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  callerNumberText: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 8,
  },
  callTypeText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  connectedDuration: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    letterSpacing: 1,
  },
  connectedLangBadge: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  teleprompterCard: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  teleprompterTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  teleprompterScript: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  langSelectorRow: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  langSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  langPillActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tipBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  btnIcon: {
    fontSize: 26,
    color: '#FFFFFF',
  },
  btnLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  inCallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 20,
    paddingHorizontal: 20,
  },
  gridBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  gridBtnEmoji: {
    fontSize: 24,
  },
  gridBtnLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  endCallWrapper: {
    alignItems: 'center',
    marginBottom: 30,
  },
});

export default FakeCallModal;
