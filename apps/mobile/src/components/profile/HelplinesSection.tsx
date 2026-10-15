import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface HelplineItem {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isHelpline?: boolean;
}

export const DEFAULT_HELPLINES: HelplineItem[] = [
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

interface HelplinesSectionProps {
  onCall?: (helpline: HelplineItem) => void;
}

export const HelplinesSection: React.FC<HelplinesSectionProps> = ({
  onCall,
}) => {
  const { colors } = useTheme();

  const handleDial = (helpline: HelplineItem) => {
    if (onCall) {
      onCall(helpline);
      return;
    }
    Alert.alert(
      `Direct Call: ${helpline.name}`,
      `Emergency helpline: ${helpline.phone}\nWould you like to dial this number now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${helpline.phone}`),
        },
      ],
    );
  };

  return (
    <>
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
              <Text style={[styles.contactName, { color: colors.textPrimary }]}>
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
              onPress={() => handleDial(helpline)}
              activeOpacity={0.8}
            >
              <Text style={[styles.testBtnText, { color: '#EF4444' }]}>
                📞 Call
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  contactsList: {
    gap: 10,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  contactIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: {
    fontSize: 20,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactRel: {
    fontSize: 11,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 12,
    fontWeight: '700',
  },
  testBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnCall: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default HelplinesSection;
