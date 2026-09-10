import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  badge: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badge: 'COMMUNITY SAFETY SHIELD',
    emoji: '🛡️',
    title: 'Welcome to SAFORA',
    subtitle: 'Your Personal Guardian',
    description:
      'A community-driven safety ecosystem protecting students and citizens with proactive alerts, real-time safety scores, and instant emergency response.',
    accentColor: colors.accent,
  },
  {
    id: '2',
    badge: 'POSTGIS SPATIAL GRID',
    emoji: '⚠️',
    title: 'Real-Time Hazards',
    subtitle: 'Campus & City Radar',
    description:
      'Identify unlit streets, waterlogged paths, and construction trenches with sub-second spatial queries powered by PostgreSQL PostGIS.',
    accentColor: colors.warning,
  },
  {
    id: '3',
    badge: 'VIRTUAL ESCORT',
    emoji: '🚶‍♀️',
    title: 'Safe Walk & SOS',
    subtitle: 'Never Walk Alone',
    description:
      'Start a timed Safe Walk escort with automatic check-in timers and an instant SOS beacon that broadcasts your live coordinates to trusted contacts.',
    accentColor: colors.danger,
  },
];

interface OnboardingScreenProps {
  navigation: any;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useAuthStore(state => state.completeOnboarding);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== currentIndex) {
      setCurrentIndex(slide);
    }
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      await completeOnboarding();
      navigation.replace('Welcome');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.replace('Welcome');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Header with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.miniLogo}
          />
          <Text style={styles.brandTitle}>SAFORA</Text>
        </View>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sliding Horizontal Content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slider}
      >
        {SLIDES.map(slide => (
          <View key={slide.id} style={styles.slide}>
            <View
              style={[styles.visualCircle, { borderColor: slide.accentColor }]}
            >
              <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            </View>

            <View style={styles.badgeBox}>
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: slide.accentColor },
                ]}
              />
              <Text style={[styles.badgeText, { color: slide.accentColor }]}>
                {slide.badge}
              </Text>
            </View>

            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            <Text style={styles.slideDesc}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === SLIDES.length - 1
              ? 'Get Started →'
              : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  slider: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  visualCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.backgroundCard,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  slideEmoji: {
    fontSize: 54,
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  bottomBar: {
    paddingHorizontal: 24,
    gap: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.accent,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: colors.border,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
