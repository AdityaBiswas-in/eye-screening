import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface RetinaLogoProps {
  size?: number;
}

export const RetinaLogo: React.FC<RetinaLogoProps> = ({ size = 96 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../../assets/eye-logo.png')}
        accessibilityLabel="RetinaCare logo"
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
};

interface RetinaAppBrandProps {
  size?: number;
  dark?: boolean;
}

export const RetinaAppBrand: React.FC<RetinaAppBrandProps> = ({ size = 32, dark = false }) => {
  return (
    <View style={styles.brandRow}>
      <RetinaLogo size={size} />
      <View style={styles.brandTextCol}>
        <View style={styles.brandTitleRow}>
          <Text style={[styles.brandMainTitle, dark && { color: '#ffffff' }]}>Retina</Text>
          <Text style={styles.brandAccentTitle}>Care</Text>
        </View>
        <Text style={[styles.brandSubtitle, dark && { color: '#94a3b8' }]}>AI EYE SCREENING</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  // Brand Header
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandAccentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.2,
    marginTop: -2,
  },
});
