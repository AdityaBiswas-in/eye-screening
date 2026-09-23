import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';

export const QualityCheckScreen: React.FC = () => {
  const { navigate, addScreening, userRole, patientProfile, account } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRetake = () => {
    navigate('eyeCamera');
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const patientName =
        patientProfile.fullName || account.fullName || 'Screening Patient';

      const initials = patientName
        .trim()
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'SP';

      const newRecord: ScreeningRecord = {
        id: Date.now().toString(),
        initials,
        name: patientName,
        date: 'Today',
        age: patientProfile.age || '—',
        condition: 'No DR (Mild Background)',
        status: 'NON-REFERABLE',
      };

      addScreening(newRecord);

      Alert.alert(
        'AI Analysis Complete',
        'Image quality verified as Gradable (94%). Retinal screening report generated successfully.',
        [
          {
            text: 'View Dashboard',
            onPress: () => {
              if (userRole === 'doctor') {
                navigate('doctorDashboard');
              } else if (userRole === 'worker') {
                navigate('workerDashboard');
              } else {
                navigate('dashboard');
              }
            },
          },
        ]
      );
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={handleRetake}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Image Quality Check</Text>
          </View>

          <View style={styles.offlineBadge}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>OFFLINE MODE</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Multi-dimensional quality review</Text>

        {/* Captured Image Preview Card */}
        <View style={styles.imageCard}>
          <Image
            source={require('../../assets/fundus_sample.jpg')}
            style={styles.fundusImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlayInfo}>
            <View style={styles.scanIconFrame}>
              <Text style={styles.scanDocIcon}>📄</Text>
            </View>
            <Text style={styles.imageCaption}>Sample OS Fundus Image</Text>
          </View>
        </View>

        {/* Gradable Image Banner */}
        <View style={styles.assessmentBanner}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>GRADABLE IMAGE</Text>
            <Text style={styles.bannerSub}>
              Adaptive preprocessing completed successfully.
            </Text>
          </View>
        </View>

        {/* Technical Details Card */}
        <View style={styles.techCard}>
          <Text style={styles.techHeader}>Technical Details</Text>

          <View style={styles.techRow}>
            <Text style={styles.metricName}>Focus & Sharpness</Text>
            <Text style={styles.metricValue}>Pass (94%)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.techRow}>
            <Text style={styles.metricName}>Pupil Illumination</Text>
            <Text style={styles.metricValue}>Pass (Optimal)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.techRow}>
            <Text style={styles.metricName}>Contrast Ratio</Text>
            <Text style={styles.metricValue}>Pass (Normal)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.techRow}>
            <Text style={styles.metricName}>Movement Artifacts</Text>
            <Text style={styles.metricValue}>Clear (No motion blur)</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.retakeButton}
          activeOpacity={0.8}
          onPress={handleRetake}
          disabled={isAnalyzing}
        >
          <Text style={styles.retakeText}>Retake Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.analyzeButton}
          activeOpacity={0.85}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.analyzeText}>Analyze with AI</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 24,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
    marginLeft: 48,
  },
  imageCard: {
    height: 220,
    borderRadius: 22,
    backgroundColor: '#090d16',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  fundusImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  imageOverlayInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  scanIconFrame: {
    marginBottom: 4,
  },
  scanDocIcon: {
    fontSize: 22,
  },
  imageCaption: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  assessmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 11.5,
    color: '#047857',
    fontWeight: '500',
  },
  techCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8edf3',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  techHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricName: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: '#f8fafc',
  },
  retakeButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  analyzeButton: {
    flex: 1.3,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  analyzeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
