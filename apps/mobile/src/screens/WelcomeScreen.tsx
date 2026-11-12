import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { hasSeenOnboarding, isAuthenticated } = useAuthStore();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Progress bar fill animation across 1.8 seconds, then navigate
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start(() => {
      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else if (hasSeenOnboarding) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'AccountSelect' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    });
  }, [fadeAnim, progressAnim, hasSeenOnboarding, isAuthenticated, navigation]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Ambient Deep Radial Backing */}
      <View style={styles.radialBackground} />

      {/* Center Shield & Branding */}
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
        <View style={styles.shieldEmblem}>
          <View style={styles.specularTopRim} />
          <Feather name="shield" size={54} color="#FFFFFF" />
        </View>

        <Text style={styles.appTitle}>SAFORA</Text>
        <Text style={styles.appTagline}>Your personal safety companion</Text>
      </Animated.View>

      {/* Bottom Liquid Glass Progress Bar Track */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radialBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0D20',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmblem: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  specularTopRim: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  appTitle: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 5.5,
    marginTop: 24,
  },
  appTagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    left: 90,
    right: 90,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#6866E6',
  },
});
