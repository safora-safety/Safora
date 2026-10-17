import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

export interface AudioWaveformBarsProps {
  isRecording?: boolean;
  barCount?: number;
  height?: number;
  activeColor?: string;
  inactiveColor?: string;
  showLabel?: boolean;
  labelText?: string;
}

export const AudioWaveformBars: React.FC<AudioWaveformBarsProps> = ({
  isRecording = true,
  barCount = 7,
  height = 24,
  activeColor = '#EF4444',
  inactiveColor = '#64748B',
  showLabel = true,
  labelText = 'LIVE AUDIO STREAMING',
}) => {
  // Array of animated scale values for each bar
  const animatedValues = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!isRecording) {
      animatedValues.forEach(val => val.setValue(0.2));
      return;
    }

    // Diverse frequencies/amplitudes for organic voice equalizer feel
    const animations = animatedValues.map((val, idx) => {
      const baseDuration = 380 + (idx % 4) * 120;
      const peakScale = 0.5 + ((idx * 3) % 5) * 0.12;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: peakScale,
            duration: baseDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.2 + (idx % 3) * 0.1,
            duration: baseDuration * 0.9,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    });

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [isRecording, barCount]);

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={
        isRecording
          ? 'Ambient audio recording active'
          : 'Audio recording paused'
      }
    >
      <View style={[styles.waveformRow, { height }]}>
        {animatedValues.map((animVal, index) => (
          <Animated.View
            key={`wave-bar-${index}`}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: isRecording ? activeColor : inactiveColor,
                transform: [{ scaleY: animVal }],
              },
            ]}
          />
        ))}
      </View>

      {showLabel && (
        <View style={styles.labelRow}>
          {isRecording && (
            <View
              style={[
                styles.liveRecordingDot,
                { backgroundColor: activeColor },
              ]}
            />
          )}
          <Text
            style={[
              styles.labelText,
              { color: isRecording ? activeColor : inactiveColor },
            ]}
          >
            {labelText}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveRecordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
