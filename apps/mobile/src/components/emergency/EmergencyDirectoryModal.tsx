import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { GlassCard } from '../common/GlassCard';

interface EmergencyDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EmergencyDirectoryModal: React.FC<
  EmergencyDirectoryModalProps
> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handleCall = (num: string) => {
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        {/* Top Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 16),
              borderBottomColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={isDark ? '#C3C1FF' : colors.primaryDark}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Emergency directory
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              India verified helplines · 24/7
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: 112 India Universal Emergency */}
          <GlassCard variant="card" style={styles.primaryEmergencyCard}>
            <View style={styles.specularRim} />
            <View style={styles.emergencyTagRow}>
              <View style={styles.emergencyPill}>
                <Text style={styles.emergencyPillText}>
                  INDIA EMERGENCY NUMBER · 24/7
                </Text>
              </View>
            </View>

            <View style={styles.numberRow}>
              <Text style={styles.bigEmergencyNumber}>112</Text>
              <View style={styles.numberLabelWrap}>
                <Text
                  style={[styles.numberTitle, { color: colors.textPrimary }]}
                >
                  Police, fire or medical
                </Text>
                <Text
                  style={[
                    styles.numberSubtitle,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  For immediate danger or unresponsiveness
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.call112Btn}
              onPress={() => handleCall('112')}
              activeOpacity={0.85}
            >
              <Feather
                name="phone-call"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.call112BtnText}>Call 112 now</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Section: Regional Helplines */}
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Regional helplines
          </Text>

          {/* Helpline 1: Ambulance / 108 */}
          <GlassCard variant="card" style={styles.helplineCard}>
            <View style={styles.helplineRow}>
              <View style={styles.helplineInfo}>
                <Text
                  style={[styles.helplineTitle, { color: colors.textPrimary }]}
                >
                  Ambulance / medical
                </Text>
                <Text
                  style={[
                    styles.helplineDesc,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Emergency ambulance in participating cities · 108
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.helplineCallBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.16)'
                      : '#ECE9FA',
                    borderColor: isDark
                      ? 'rgba(139, 137, 255, 0.3)'
                      : 'rgba(110, 100, 225, 0.25)',
                  },
                ]}
                onPress={() => handleCall('108')}
                activeOpacity={0.8}
              >
                <Feather
                  name="phone"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.helplineCallBtnText,
                    { color: isDark ? '#C3C1FF' : colors.primaryDark },
                  ]}
                >
                  Call 108
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Helpline 2: Women Helpline / 1090 */}
          <GlassCard variant="card" style={styles.helplineCard}>
            <View style={styles.helplineRow}>
              <View style={styles.helplineInfo}>
                <Text
                  style={[styles.helplineTitle, { color: colors.textPrimary }]}
                >
                  Women helpline
                </Text>
                <Text
                  style={[
                    styles.helplineDesc,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  Women Power Line · specialist officers for harassment · 1090
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.helplineCallBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.16)'
                      : '#ECE9FA',
                    borderColor: isDark
                      ? 'rgba(139, 137, 255, 0.3)'
                      : 'rgba(110, 100, 225, 0.25)',
                  },
                ]}
                onPress={() => handleCall('1090')}
                activeOpacity={0.8}
              >
                <Feather
                  name="phone"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.helplineCallBtnText,
                    { color: isDark ? '#C3C1FF' : colors.primaryDark },
                  ]}
                >
                  Call 1090
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Helpline 3: Child Helpline / 1098 */}
          <GlassCard variant="card" style={styles.helplineCard}>
            <View style={styles.helplineRow}>
              <View style={styles.helplineInfo}>
                <Text
                  style={[styles.helplineTitle, { color: colors.textPrimary }]}
                >
                  Child emergency helpline
                </Text>
                <Text
                  style={[
                    styles.helplineDesc,
                    { color: isDark ? '#A3A7C8' : colors.textSecondary },
                  ]}
                >
                  National emergency response for children · 1098
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.helplineCallBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.16)'
                      : '#ECE9FA',
                    borderColor: isDark
                      ? 'rgba(139, 137, 255, 0.3)'
                      : 'rgba(110, 100, 225, 0.25)',
                  },
                ]}
                onPress={() => handleCall('1098')}
                activeOpacity={0.8}
              >
                <Feather
                  name="phone"
                  size={14}
                  color={isDark ? '#C3C1FF' : colors.primaryDark}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.helplineCallBtnText,
                    { color: isDark ? '#C3C1FF' : colors.primaryDark },
                  ]}
                >
                  Call 1098
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Disclaimer Footer Card */}
          <View style={styles.noticeCard}>
            <Text
              style={[
                styles.noticeText,
                { color: isDark ? '#8F94BA' : colors.textSecondary },
              ]}
            >
              If a regional number does not connect, call 112. SAFORA does not
              replace calling 112.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  primaryEmergencyCard: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  emergencyTagRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  emergencyPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emergencyPillText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  bigEmergencyNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -1,
  },
  numberLabelWrap: {
    flex: 1,
  },
  numberTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  numberSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  call112Btn: {
    height: 50,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  call112BtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  helplineCard: {
    padding: 16,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  helplineInfo: {
    flex: 1,
  },
  helplineTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  helplineDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  helplineCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  helplineCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  noticeText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
