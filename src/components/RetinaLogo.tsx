import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface RetinaLogoProps {
  size?: number;
}

export const RetinaLogo: React.FC<RetinaLogoProps> = ({ size = 110 }) => {
  const retinaDiscSize = size * 0.64;
  const badgeSize = size * 0.30;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Squircle Container */}
      <View
        style={[
          styles.squircle,
          {
            width: size,
            height: size,
            borderRadius: size * 0.32,
            backgroundColor: colors.primary,
          },
        ]}
      >
        {/* Retinal Fundus Disc */}
        <View
          style={[
            styles.retinaDisc,
            {
              width: retinaDiscSize,
              height: retinaDiscSize,
              borderRadius: retinaDiscSize / 2,
            },
          ]}
        >
          {/* Dashed outer guideline ring */}
          <View
            style={[
              styles.dashedRing,
              {
                width: retinaDiscSize * 0.88,
                height: retinaDiscSize * 0.88,
                borderRadius: (retinaDiscSize * 0.88) / 2,
              },
            ]}
          />

          {/* Microvascular vessel lines */}
          <View style={[styles.vesselLine, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '-35deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '80deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '-70deg' }] }]} />

          {/* Optic Disc / Fovea Center */}
          <View style={styles.foveaGlow}>
            <View style={styles.foveaCenter} />
          </View>
        </View>
      </View>

      {/* Floating AI Badge */}
      <View
        style={[
          styles.aiBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            right: -size * 0.04,
            bottom: -size * 0.04,
          },
        ]}
      >
        <Text style={styles.aiText}>AI</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  squircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  retinaDisc: {
    backgroundColor: '#fffdf5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#e8dcba',
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#cbb387',
    borderStyle: 'dashed',
  },
  vesselLine: {
    position: 'absolute',
    width: '65%',
    height: 1,
    backgroundColor: 'rgba(217, 119, 90, 0.45)',
  },
  foveaGlow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(217, 119, 90, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foveaCenter: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#b45309',
  },
  aiBadge: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  aiText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
