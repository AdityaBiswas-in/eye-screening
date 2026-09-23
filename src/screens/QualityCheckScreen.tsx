import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';

export const QualityCheckScreen: React.FC = () => {
  const { navigate, addScreening, setActiveReportRecord, userRole, patientProfile, account } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleExitToDashboard = () => {
    if (userRole === 'doctor') {
      navigate('doctorDashboard');
    } else if (userRole === 'worker') {
      navigate('workerDashboard');
    } else {
      navigate('dashboard');
    }
  };

  const handleRetake = () => {
    navigate('eyeCamera');
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);

      const patientName =
        patientProfile.fullName || account.fullName || 'Screening Patient';

      const initials =
        patientName
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
        drGrade: 'No DR (Mild Background)',
        aiConfidence: 94,
        imageQuality: 'Good',
        imageQualityStatus: 'done',
        recommendation:
          'Routine annual dilated retinal screening advised. Maintain healthy glycemic and blood pressure parameters.',
        evidence: [
          { name: 'Microaneurysm-like regions', level: 'None', color: 'green' },
          { name: 'Hemorrhage-like regions', level: 'None', color: 'green' },
          { name: 'Hard exudate-like regions', level: 'Low', color: 'green' },
        ],
        recommendedDoctor: {
          name: 'Dr. Sarah Jenkins, MD',
          specialty: 'Retina Specialist & Vitreoretinal Surgeon',
          hospital: 'Apex Eye Institute & Research Hospital',
          contact: '+91 98765 43210',
          timeframe: 'Annual routine screening (12 months)',
        },
      };

      addScreening(newRecord);
      setActiveReportRecord(newRecord);
      setAnalysisComplete(true);
    }, 1000);
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Image Quality</Text>
          </View>

          <View style={styles.topRightRow}>
            <View style={styles.offlineBadge}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>OFFLINE</Text>
            </View>

            <TouchableOpacity
              style={styles.exitButton}
              activeOpacity={0.7}
              onPress={handleExitToDashboard}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.exitIcon}>✕</Text>
            </TouchableOpacity>
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
          <Text style={styles.retakeText}>Retake</Text>
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

      {/* Analysis Complete Modal */}
      {analysisComplete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCheckCircle}>
              <Text style={styles.modalCheckIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>AI Analysis Complete</Text>
            <Text style={styles.modalSub}>
              Image verified as Gradable (94%). Clinical screening report and specialist guidance ready.
            </Text>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              activeOpacity={0.85}
              onPress={() => navigate('reportScreen')}
            >
              <Text style={styles.modalPrimaryText}>📄 View Full Report ›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              activeOpacity={0.7}
              onPress={() => navigate('screeningHistory')}
            >
              <Text style={styles.modalSecondaryText}>View Screening History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalTertiaryButton}
              activeOpacity={0.7}
              onPress={handleExitToDashboard}
            >
              <Text style={styles.modalTertiaryText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e6f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  offlineText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  exitIcon: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalCheckIcon: {
    fontSize: 28,
    color: '#059669',
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalPrimaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalTertiaryButton: {
    width: '100%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTertiaryText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
