import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const EyeCameraScreen: React.FC = () => {
  const { navigate, goBack, canGoBack, userRole, setCapturedImage } = useApp();
  const [isCapturing, setIsCapturing] = useState(false);
  const [goodLighting, setGoodLighting] = useState(true);
  const [retinaDetected, setRetinaDetected] = useState(true);
  const [isSteady, setIsSteady] = useState(false);

  // Simulate realistic camera viewfinder alignment stabilization
  React.useEffect(() => {
    // Stage 1: Lighting and retina detected immediately
    const t1 = setTimeout(() => {
      setIsSteady(true);
    }, 1800);

    return () => {
      clearTimeout(t1);
    };
  }, []);

  const handleCapture = () => {
    // Snap image from viewfinder with shutter flash, without opening file picker
    setIsCapturing(true);
    setCapturedImage(null, null);
    setTimeout(() => {
      setIsCapturing(false);
      navigate('qualityCheck');
    }, 350);
  };

  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let fileObj: File | null = null;
        if (asset.file) {
          fileObj = asset.file as File;
        }
        setCapturedImage(asset.uri, fileObj);
        setIsCapturing(true);
        setTimeout(() => {
          setIsCapturing(false);
          navigate('qualityCheck');
        }, 300);
        return;
      }
    } catch {
      // Fallback
    }

    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        setCapturedImage(uri, file);
        setIsCapturing(true);
        setTimeout(() => {
          setIsCapturing(false);
          navigate('qualityCheck');
        }, 300);
      };
      input.click();
    }
  };

  const handleExit = () => {
    try {
      if (canGoBack) {
        goBack();
      } else if (userRole === 'doctor') {
        navigate('doctorDashboard');
      } else if (userRole === 'worker') {
        navigate('workerDashboard');
      } else {
        navigate('dashboard');
      }
    } catch {
      navigate('dashboard');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleExit}
          hitSlop={15}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Capture fundus image</Text>
      </View>

      {/* Main Viewfinder / Reticle Target Area */}
      <View style={styles.viewfinder}>
        {/* Reticle Target with Retinal graphic and corner brackets */}
        <View style={styles.reticleWrapper}>
          {/* 4 Corner Framing Brackets */}
          <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
          <View style={[styles.cornerBracket, styles.bracketTopRight]} />
          <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
          <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

          {/* Concentric Guide Circles with Retina Art */}
          <View style={styles.outerTargetCircle}>
            <View style={styles.dashedGuidelineCircle}>
              {/* Concentric layered retinal vessel illustration */}
              <View style={styles.retinaDiscOuter}>
                <View style={styles.retinaDiscMid}>
                  <View style={styles.retinaDiscInner}>
                    {/* Retinal vessels and optic cup */}
                    <View style={styles.opticCup} />
                    <View style={[styles.vesselBranch, styles.vesselUp]} />
                    <View style={[styles.vesselBranch, styles.vesselDown]} />
                    <View style={[styles.vesselBranch, styles.vesselLeft]} />
                    <View style={[styles.vesselBranch, styles.vesselRight]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Center Prompt */}
        <Text style={styles.centerGuidePrompt}>
          Center the retina inside the guide
        </Text>

        {/* Real-time Checklist */}
        <View style={styles.checklistContainer}>
          {/* Check 1: Good lighting */}
          <TouchableOpacity
            style={styles.checkItem}
            activeOpacity={0.7}
            onPress={() => setGoodLighting((p) => !p)}
          >
            <View style={goodLighting ? styles.checkBadgeGreen : styles.checkBadgeGray}>
              {goodLighting ? (
                <Ionicons name="checkmark" size={13} color="#ffffff" />
              ) : (
                <View style={styles.checkDotInner} />
              )}
            </View>
            <Text style={goodLighting ? styles.checkItemText : styles.checkItemTextMuted}>
              Good lighting
            </Text>
          </TouchableOpacity>

          {/* Check 2: Retina detected */}
          <TouchableOpacity
            style={styles.checkItem}
            activeOpacity={0.7}
            onPress={() => setRetinaDetected((p) => !p)}
          >
            <View style={retinaDetected ? styles.checkBadgeGreen : styles.checkBadgeGray}>
              {retinaDetected ? (
                <Ionicons name="checkmark" size={13} color="#ffffff" />
              ) : (
                <View style={styles.checkDotInner} />
              )}
            </View>
            <Text style={retinaDetected ? styles.checkItemText : styles.checkItemTextMuted}>
              Retina detected
            </Text>
          </TouchableOpacity>

          {/* Check 3: Hold steady */}
          <TouchableOpacity
            style={styles.checkItem}
            activeOpacity={0.7}
            onPress={() => setIsSteady((p) => !p)}
          >
            <View style={isSteady ? styles.checkBadgeGreen : styles.checkBadgeGray}>
              {isSteady ? (
                <Ionicons name="checkmark" size={13} color="#ffffff" />
              ) : (
                <View style={styles.checkDotInner} />
              )}
            </View>
            <Text style={isSteady ? styles.checkItemText : styles.checkItemTextMuted}>
              {isSteady ? 'Steady position locked' : 'Hold steady'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Actions: Capture Button & Upload existing image */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.captureButton}
          activeOpacity={0.85}
          onPress={handleCapture}
        >
          <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.captureButtonText}>Capture</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadLinkButton}
          activeOpacity={0.7}
          onPress={handleUploadImage}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.uploadLinkText}>Upload existing image</Text>
        </TouchableOpacity>
      </View>

      {/* Screen flash on capture */}
      {isCapturing && <View style={styles.flashOverlay} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c121d',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 28,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#182232',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  reticleWrapper: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  // 4 Corner Framing Brackets
  cornerBracket: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#0f766e',
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  outerTargetCircle: {
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  dashedGuidelineCircle: {
    width: 206,
    height: 206,
    borderRadius: 103,
    borderWidth: 1.2,
    borderColor: '#0d9488',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retinaDiscOuter: {
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: '#1b120c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retinaDiscMid: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: '#2e1c12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retinaDiscInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3d2417',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  opticCup: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d97706',
    borderWidth: 2,
    borderColor: '#f59e0b',
    zIndex: 2,
  },
  vesselBranch: {
    position: 'absolute',
    backgroundColor: '#dc2626',
    opacity: 0.65,
  },
  vesselUp: {
    width: 2.5,
    height: 48,
    top: 8,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  vesselDown: {
    width: 2.5,
    height: 44,
    bottom: 8,
    borderRadius: 2,
    transform: [{ rotate: '-12deg' }],
  },
  vesselLeft: {
    width: 44,
    height: 2.5,
    left: 8,
    borderRadius: 2,
    transform: [{ rotate: '-18deg' }],
  },
  vesselRight: {
    width: 40,
    height: 2.5,
    right: 12,
    borderRadius: 2,
    transform: [{ rotate: '22deg' }],
  },
  centerGuidePrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center',
  },
  checklistContainer: {
    width: '100%',
    maxWidth: 240,
    gap: 12,
    alignSelf: 'center',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBadgeGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkBadgeIcon: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  checkBadgeGray: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
  },
  checkItemText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  checkItemTextMuted: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 6,
  },
  captureButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  uploadLinkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  uploadLinkText: {
    color: '#94a3b8',
    fontSize: 13.5,
    fontWeight: '600',
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
