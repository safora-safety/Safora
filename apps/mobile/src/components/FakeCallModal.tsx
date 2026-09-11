import React, { useState, useEffect, useRef } from 'react';
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
  const [isSpeaker, setIsSpeaker] = useState(true);

  // Vibration pattern while ringing
  useEffect(() => {
    if (visible && callState === 'incoming') {
      Vibration.vibrate([500, 1000, 500, 1000], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
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
    }
  }, [visible]);

  const handleAccept = () => {
    Vibration.cancel();
    setCallState('connected');
  };

  const handleDecline = () => {
    Vibration.cancel();
    onClose();
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
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={handleAccept}
                activeOpacity={0.8}
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
              <Text style={styles.connectedDuration}>
                {formatDuration(callSeconds)}
              </Text>
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
                onPress={() => setIsSpeaker(!isSpeaker)}
              >
                <Text style={styles.gridBtnEmoji}>🔊</Text>
                <Text style={styles.gridBtnLabel}>Speaker</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridBtn}>
                <Text style={styles.gridBtnEmoji}>➕</Text>
                <Text style={styles.gridBtnLabel}>Add call</Text>
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
