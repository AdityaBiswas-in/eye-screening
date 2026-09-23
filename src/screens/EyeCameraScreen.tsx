import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const EyeCameraScreen: React.FC = () => {
  const { navigate, goBack, canGoBack, userRole } = useApp();

  const [selectedEye, setSelectedEye] = useState<'LEFT EYE (OS)' | 'RIGHT EYE (OD)'>('LEFT EYE (OS)');
  const [torchOn, setTorchOn] = useState(true);
  const [countdown, setCountdown] = useState(1.5);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0.5 ? Number((prev - 0.1).toFixed(1)) : 1.5));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulse animation for fixation red dot
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      navigate('qualityCheck');
    }, 300);
  };

  const handleToggleEye = () => {
    setSelectedEye((prev) =>
      prev === 'LEFT EYE (OS)' ? 'RIGHT EYE (OD)' : 'LEFT EYE (OS)'
    );
  };

  const handleExit = () => {
    if (canGoBack) {
      goBack();
    } else if (userRole === 'doctor') {
      navigate('doctorDashboard');
    } else if (userRole === 'worker') {
      navigate('workerDashboard');
    } else {
      navigate('dashboard');
    }
  };

  const showHelpGuide = () => {
    Alert.alert(
      'Camera Alignment Guide',
      '1. Hold the camera steady at approximately 12-15 cm from patient eye.\n2. Ask patient to look straight into the red fixation dot.\n3. Keep pupil centered within the inner dashed guideline.\n4. When stability reads "Excellent", tap shutter or hold steady for auto-capture.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.eyeTogglePill}
          activeOpacity={0.8}
          onPress={handleToggleEye}
        >
          <Text style={styles.eyeToggleText}>{selectedEye}</Text>
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={[styles.torchPill, torchOn && styles.torchPillActive]}
            activeOpacity={0.8}
            onPress={() => setTorchOn((prev) => !prev)}
          >
            <Text style={styles.torchText}>
              {torchOn ? '💡 TORCH ON' : '🔦 TORCH OFF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.7}
            onPress={handleExit}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.viewfinder}>
        {/* Reticle Target Graphics */}
        <View style={styles.reticleContainer}>
          {/* Outer circle with crosshair indicators */}
          <View style={styles.outerCircle}>
            <View style={[styles.crosshairTick, styles.tickTop]} />
            <View style={[styles.crosshairTick, styles.tickBottom]} />
            <View style={[styles.crosshairTick, styles.tickLeft]} />
            <View style={[styles.crosshairTick, styles.tickRight]} />

            {/* Inner dashed circle */}
            <View style={styles.innerDashedCircle}>
              {/* Center fixation red dot */}
              <Animated.View
                style={[
                  styles.redFixationDot,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Distance / Alignment Guidance Badge */}
        <View style={styles.guidancePill}>
          <Text style={styles.guidanceTitle}>Too Close! Pull back slightly</Text>
          <Text style={styles.guidanceSub}>
            Maintain 12cm for auto-focus block
          </Text>
        </View>
      </View>

      {/* White Bottom Control Panel */}
      <View style={styles.bottomControlPanel}>
        {/* Status Indicators Row */}
        <View style={styles.indicatorRow}>
          <View style={styles.stabilityBadge}>
            <View style={styles.stabilityDot} />
            <Text style={styles.stabilityText}>Stability: Excellent</Text>
          </View>
          <Text style={styles.autoCaptureText}>
            Auto-capture in {countdown.toFixed(1)}s
          </Text>
        </View>

        {/* Main Controls: Flip Eye, Shutter, Help */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.sideButton}
            activeOpacity={0.75}
            onPress={handleToggleEye}
          >
            <Text style={styles.sideButtonIcon}>🔄</Text>
          </TouchableOpacity>

          {/* Shutter Capture Button */}
          <TouchableOpacity
            style={styles.shutterOuter}
            activeOpacity={0.8}
            onPress={handleCapture}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideButton}
            activeOpacity={0.75}
            onPress={showHelpGuide}
          >
            <Text style={styles.sideButtonIcon}>❓</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy & Security Footnote */}
        <View style={styles.securityRow}>
          <Text style={styles.securityText}>
            🔒 Certified secure processing. No facial biometric elements are stored.
          </Text>
        </View>
      </View>

      {/* Screen flash on capture */}
      {isCapturing && <View style={styles.flashOverlay} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    zIndex: 10,
  },
  eyeTogglePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eyeToggleText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  torchPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  torchPillActive: {
    borderColor: '#0d9488',
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
  },
  torchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  crosshairTick: {
    position: 'absolute',
    backgroundColor: '#14b8a6',
  },
  tickTop: {
    width: 2,
    height: 12,
    top: -6,
  },
  tickBottom: {
    width: 2,
    height: 12,
    bottom: -6,
  },
  tickLeft: {
    width: 12,
    height: 2,
    left: -6,
  },
  tickRight: {
    width: 12,
    height: 2,
    right: -6,
  },
  innerDashedCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redFixationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  guidancePill: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  guidanceTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  guidanceSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  bottomControlPanel: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 7,
  },
  stabilityText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  autoCaptureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e6f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonIcon: {
    fontSize: 20,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
  },
  securityRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  securityText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 15,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 99,
  },
});
