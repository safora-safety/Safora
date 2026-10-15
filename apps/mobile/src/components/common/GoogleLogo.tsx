import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

const googleLogoSource = require('../../assets/google_logo.png');

interface GoogleLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const GoogleLogo: React.FC<GoogleLogoProps> = ({ size = 20, style }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={googleLogoSource}
        style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GoogleLogo;
