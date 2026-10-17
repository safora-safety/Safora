import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface SafetyFabDrawerProps {
  onTriggerFakeCall: () => void;
  onToggleSiren: () => void;
  isSirenActive: boolean;
  onStartSafeWalk: () => void;
  onPinHazard: () => void;
  onOpenCalculatorDecoy: () => void;
  onCall112?: () => void;
  bottomOffset?: number;
}

export const SafetyFabDrawer: React.FC<SafetyFabDrawerProps> = ({
  onTriggerFakeCall,
  onToggleSiren,
  isSirenActive,
  onStartSafeWalk,
  onPinHazard,
  onOpenCalculatorDecoy,
  onCall112,
  bottomOffset = 24,
}) => {
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Persistent Safety FAB Button */}
      <View
        style={[styles.fabWrapper, { bottom: bottomOffset }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          activeOpacity={0.85}
          style={[
            styles.fabButton,
            {
              backgroundColor: isSirenActive ? colors.danger : colors.primary,
              shadowColor: isSirenActive ? colors.danger : colors.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open Emergency Safety Tools Drawer"
        >
          <View style={styles.fabPulseRing} />
          <Text style={styles.fabEmoji}>{isSirenActive ? '🔊' : '🛡️'}</Text>
          <Text style={styles.fabLabel}>
            {isSirenActive ? 'SIREN' : 'SAFETY'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slide-Up Safety Action Drawer */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.drawerContent,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceElevated
                      : '#FFFFFF',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : colors.border,
                  },
                ]}
              >
                {/* Drag Handle Indicator */}
                <View style={styles.dragHandle} />

                <View style={styles.drawerHeader}>
                  <View>
                    <Text
                      style={[
                        styles.drawerTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Quick Safety Actions
                    </Text>
                    <Text
                      style={[
                        styles.drawerSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Instant protection and discrete emergency tools
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={[
                      styles.closeBtn,
                      {
                        backgroundColor: isDark
                          ? '#1E293B'
                          : colors.surfaceHover,
                      },
                    ]}
                  >
                    <Text
                      style={{ color: colors.textSecondary, fontWeight: '700' }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Grid of Safety Tools */}
                <View style={styles.toolsGrid}>
                  {/* Tool 1: SOS Siren */}
                  <TouchableOpacity
                    onPress={() => handleAction(onToggleSiren)}
                    style={[
                      styles.toolCard,
                      {
                        backgroundColor: isSirenActive
                          ? 'rgba(239, 68, 68, 0.15)'
                          : isDark
                            ? '#1E293B'
                            : '#F8FAFC',
                        borderColor: isSirenActive
                          ? colors.danger
                          : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.toolEmoji}>
                      {isSirenActive ? '🔕' : '🔊'}
                    </Text>
                    <Text
                      style={[
                        styles.toolTitle,
                        {
                          color: isSirenActive
                            ? colors.danger
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {isSirenActive ? 'Stop Siren' : 'Instant Siren'}
                    </Text>
                    <Text
                      style={[styles.toolSub, { color: colors.textSecondary }]}
                    >
                      {isSirenActive ? 'Siren playing' : 'Loud deterrent audio'}
                    </Text>
                  </TouchableOpacity>

                  {/* Tool 2: Fake Phone Call */}
                  <TouchableOpacity
                    onPress={() => handleAction(onTriggerFakeCall)}
                    style={[
                      styles.toolCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.toolEmoji}>📞</Text>
                    <Text
                      style={[styles.toolTitle, { color: colors.textPrimary }]}
                    >
                      Fake Call (5s)
                    </Text>
                    <Text
                      style={[styles.toolSub, { color: colors.textSecondary }]}
                    >
                      Discrete escape excuse
                    </Text>
                  </TouchableOpacity>

                  {/* Tool 3: Start Safe Walk */}
                  <TouchableOpacity
                    onPress={() => handleAction(onStartSafeWalk)}
                    style={[
                      styles.toolCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.toolEmoji}>🚶‍♀️</Text>
                    <Text
                      style={[styles.toolTitle, { color: colors.textPrimary }]}
                    >
                      Safe Walk Escort
                    </Text>
                    <Text
                      style={[styles.toolSub, { color: colors.textSecondary }]}
                    >
                      Live guardian GPS link
                    </Text>
                  </TouchableOpacity>

                  {/* Tool 4: Pin Hazard */}
                  <TouchableOpacity
                    onPress={() => handleAction(onPinHazard)}
                    style={[
                      styles.toolCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.toolEmoji}>⚠️</Text>
                    <Text
                      style={[styles.toolTitle, { color: colors.textPrimary }]}
                    >
                      Report Hazard
                    </Text>
                    <Text
                      style={[styles.toolSub, { color: colors.textSecondary }]}
                    >
                      Pin street lighting / threat
                    </Text>
                  </TouchableOpacity>

                  {/* Tool 5: Calculator Decoy */}
                  <TouchableOpacity
                    onPress={() => handleAction(onOpenCalculatorDecoy)}
                    style={[
                      styles.toolCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.toolEmoji}>🧮</Text>
                    <Text
                      style={[styles.toolTitle, { color: colors.textPrimary }]}
                    >
                      Stealth Decoy
                    </Text>
                    <Text
                      style={[styles.toolSub, { color: colors.textSecondary }]}
                    >
                      Calculator PIN 9999
                    </Text>
                  </TouchableOpacity>

                  {/* Tool 6: 112 Police Emergency */}
                  {onCall112 && (
                    <TouchableOpacity
                      onPress={() => handleAction(onCall112)}
                      style={[
                        styles.toolCard,
                        {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderColor: colors.danger,
                        },
                      ]}
                    >
                      <Text style={styles.toolEmoji}>🚨</Text>
                      <Text
                        style={[styles.toolTitle, { color: colors.danger }]}
                      >
                        Dial 112
                      </Text>
                      <Text
                        style={[
                          styles.toolSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        National emergency line
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
  },
  fabButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPulseRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fabEmoji: {
    fontSize: 22,
  },
  fabLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 163, 175, 0.5)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  drawerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  toolEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toolSub: {
    fontSize: 11,
    lineHeight: 14,
  },
});
