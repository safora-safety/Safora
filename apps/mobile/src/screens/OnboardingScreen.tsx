import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { GlassButton } from '../components/common/GlassButton';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  badge: string;
  iconName: string;
  title: string;
  subtitle: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badge: 'COMMUNITY SAFETY SHIELD',
    iconName: 'shield',
    title: 'Welcome to SAFORA',
    subtitle: 'Your personal safety companion',
    description:
      'A safety network for women and citizens with a live hazard radar, location sharing and quick alerts to your guardians.',
  },
  {
    id: '2',
    badge: 'SAFETY RADAR',
    iconName: 'compass',
    title: 'Live radar and maps',
    subtitle: 'Spot hazards before you get there',
    description:
      'Spot poorly lit roads, isolated spots and hazards, with offline maps for the area around you.',
  },
  {
    id: '3',
    badge: 'VIRTUAL ESCORT',
    iconName: 'navigation',
    title: 'Safe Walk escort',
    subtitle: 'Never walk alone',
    description:
      'Share your walk with a guardian, get route guidance and an alarm trigger when you arrive safely.',
  },
  {
    id: '4',
    badge: 'WORKS WITHOUT INTERNET',
    iconName: 'alert-triangle',
    title: 'Instant SOS and decoy',
    subtitle: 'Safety fallbacks without internet',
    description:
      'Emergency SMS with zero-internet, fast 112 calling and a calculator decoy. SAFORA does not replace calling 112.',
  },
];

interface OnboardingScreenProps {
  navigation: any;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  );
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<any>(null);
  const completeOnboarding = useAuthStore(state => state.completeOnboarding);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== currentIndex && slide >= 0 && slide < SLIDES.length) {
      setCurrentIndex(slide);
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'AccountSelect' }],
    });
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await handleFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandIconBox,
              { backgroundColor: colors.primaryDark },
            ]}
          >
            <Feather name="shield" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>
            SAFORA
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.skipButton,
            {
              backgroundColor: isDark ? 'rgba(139, 137, 255, 0.17)' : '#ECE9FA',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(110, 100, 225, 0.18)',
            },
          ]}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.skipText,
              { color: isDark ? '#C3C1FF' : colors.primaryDark },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
      >
        {SLIDES.map(slide => (
          <View key={slide.id} style={[styles.slideContainer, { width }]}>
            {/* Glowing Icon Circle */}
            <View
              style={[
                styles.iconGlowCircle,
                {
                  backgroundColor: isDark
                    ? 'rgba(139, 137, 255, 0.17)'
                    : '#ECE9FA',
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Feather
                name={slide.iconName}
                size={58}
                color={isDark ? '#B4B2FF' : colors.primaryDark}
              />
            </View>

            {/* Category Subtitle Badge */}
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(139, 137, 255, 0.18)'
                    : '#ECE9FA',
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: isDark ? '#C3C1FF' : colors.primaryDark },
                ]}
              >
                {slide.badge}
              </Text>
            </View>

            {/* Slide Title */}
            <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
              {slide.title}
            </Text>

            {/* Slide Subtitle */}
            <Text
              style={[
                styles.slideSubtitle,
                { color: isDark ? '#B4B2FF' : colors.primary },
              ]}
            >
              {slide.subtitle}
            </Text>

            {/* Slide Description */}
            <Text
              style={[
                styles.slideDesc,
                { color: isDark ? '#A3A7C8' : colors.textSecondary },
              ]}
            >
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Liquid Glass Controls */}
      <View
        style={[
          styles.bottomControls,
          { paddingBottom: Math.max(insets.bottom, 24) + 8 },
        ]}
      >
        {/* Step Indicator Pills */}
        <View style={styles.indicatorRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicatorDot,
                i === currentIndex
                  ? [
                      styles.indicatorActive,
                      { backgroundColor: colors.primaryDark },
                    ]
                  : [
                      styles.indicatorInactive,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.22)'
                          : 'rgba(110, 100, 225, 0.25)',
                      },
                    ],
              ]}
            />
          ))}
        </View>

        {/* Primary CTA */}
        <View style={styles.buttonWrap}>
          <GlassButton
            title={
              currentIndex === SLIDES.length - 1
                ? 'Get started →'
                : 'Continue →'
            }
            variant="primary"
            size="lg"
            onPress={handleNext}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  carousel: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  iconGlowCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  bottomControls: {
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  indicatorDot: {
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 26,
  },
  indicatorInactive: {
    width: 8,
  },
  buttonWrap: {
    width: '100%',
  },
});
