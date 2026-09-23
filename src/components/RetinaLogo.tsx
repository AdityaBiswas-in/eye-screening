import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface RetinaLogoProps {
  size?: number;
  showAiBadge?: boolean;
}

export const RetinaLogo: React.FC<RetinaLogoProps> = ({ size = 96, showAiBadge = true }) => {
  const retinaDiscSize = size * 0.68;
  const badgeSize = size * 0.30;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Glow / Squircle Container */}
      <View
        style={[
          styles.squircle,
          {
            width: size,
            height: size,
            borderRadius: size * 0.30,
            backgroundColor: '#0284c7',
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
          {/* Subtle concentric calibration rings */}
          <View
            style={[
              styles.dashedRing,
              {
                width: retinaDiscSize * 0.86,
                height: retinaDiscSize * 0.86,
                borderRadius: (retinaDiscSize * 0.86) / 2,
              },
            ]}
          />
          <View
            style={[
              styles.innerRing,
              {
                width: retinaDiscSize * 0.52,
                height: retinaDiscSize * 0.52,
                borderRadius: (retinaDiscSize * 0.52) / 2,
              },
            ]}
          />

          {/* Microvascular vessel lines */}
          <View style={[styles.vesselLine, { transform: [{ rotate: '40deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '-35deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '85deg' }] }]} />
          <View style={[styles.vesselLine, { transform: [{ rotate: '-75deg' }] }]} />

          {/* Precision Focus Target Lines */}
          <View style={styles.reticleHorizontal} />
          <View style={styles.reticleVertical} />

          {/* Optic Disc / Fovea Center */}
          <View style={styles.foveaGlow}>
            <View style={styles.foveaCenter} />
          </View>
        </View>
      </View>

      {/* Floating AI Diagnostic Badge */}
      {showAiBadge && (
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
      )}
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
      <RetinaLogo size={size} showAiBadge={false} />
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
  squircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  retinaDisc: {
    backgroundColor: '#fffdf5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderStyle: 'dashed',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#fca5a5',
    opacity: 0.5,
  },
  vesselLine: {
    position: 'absolute',
    width: '68%',
    height: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 1,
  },
  reticleHorizontal: {
    position: 'absolute',
    width: '32%',
    height: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
  },
  reticleVertical: {
    position: 'absolute',
    height: '32%',
    width: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
  },
  foveaGlow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foveaCenter: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  aiBadge: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  aiText: {
    color: '#0284c7',
    fontWeight: '800',
    fontSize: 10.5,
    letterSpacing: 0.5,
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

