import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';

export const QualityCheckScreen: React.FC = () => {
  const { navigate, addScreening, setActiveReportRecord, userRole, patientProfile, account } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Patient detail entry modal/step states (specifically for worker flow: Camera -> Quality -> Patient Info)
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientFullName, setPatientFullName] = useState(
    userRole === 'patient' ? (patientProfile.fullName || account.fullName || '') : ''
  );
  const [patientAge, setPatientAge] = useState(
    userRole === 'patient' ? (patientProfile.age || '') : ''
  );
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientDiabetes, setPatientDiabetes] = useState<'Yes' | 'Not sure'>('Not sure');

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

  // Called when tapping "Analyze with AI"
  const handleStartAnalysis = () => {
    // If worker (or if patient full name is not set), ask worker to fill in patient details
    if (userRole === 'worker' || !patientProfile.fullName) {
      setShowPatientForm(true);
    } else {
      runAiAnalysis(patientProfile.fullName || account.fullName || 'Screening Patient', patientProfile.age || '—');
    }
  };

  const handleSubmitPatientDetails = () => {
    if (!patientFullName.trim()) {
      Alert.alert('Required Field', 'Please enter the patient’s full name.');
      return;
    }
    setShowPatientForm(false);
    runAiAnalysis(patientFullName.trim(), patientAge.trim() || '—');
  };

  // Step-by-step progress tracking for the 'Analyzing retina' screen
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [savedTargetName, setSavedTargetName] = useState<string>('');
  const [savedTargetAge, setSavedTargetAge] = useState<string>('');

  const finishAnalysis = (targetName: string, targetAge: string) => {
    const patientName = targetName || 'Screening Patient';

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
      age: targetAge || '—',
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
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const runAiAnalysis = (targetName: string, targetAge: string) => {
    setSavedTargetName(targetName);
    setSavedTargetAge(targetAge);
    setIsAnalyzing(true);
    setAnalysisStep(1); // Checking image

    setTimeout(() => {
      setAnalysisStep(2); // Analyzing retina
    }, 900);

    setTimeout(() => {
      setAnalysisStep(3); // Looking for signs of diabetic retinopathy
    }, 1800);

    setTimeout(() => {
      setAnalysisStep(4); // Preparing result
    }, 2700);

    setTimeout(() => {
      finishAnalysis(targetName, targetAge);
    }, 3600);
  };

  const handleSkipAnalysis = () => {
    finishAnalysis(savedTargetName, savedTargetAge);
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
              <Ionicons name="close" size={20} color="#64748b" />
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
        </View>

        {/* Gradable Image Banner */}
        <View style={styles.assessmentBanner}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={16} color="#ffffff" />
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
          onPress={handleStartAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.analyzeText}>Analyse</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Patient Details Input Modal (Shown after Quality Check before AI Analysis) */}
      {showPatientForm && (
        <View style={styles.formModalOverlay}>
          <TouchableOpacity
            style={styles.formModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPatientForm(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.formModalKeyboardAvoid}
          >
            <View style={styles.formModalCard}>
              <View style={styles.formModalHeader}>
                <View>
                  <Text style={styles.formModalBadge}>STEP 3 OF 3</Text>
                  <Text style={styles.formModalTitle}>Patient Details</Text>
                </View>
                <TouchableOpacity
                  style={styles.formModalClose}
                  onPress={() => setShowPatientForm(false)}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.formModalSubtitle}>
                Fundus image passed quality check. Enter patient information to proceed with AI analysis.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {/* Patient Full Name */}
                <Text style={styles.inputLabel}>PATIENT FULL NAME *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={colors.textLight}
                  value={patientFullName}
                  onChangeText={setPatientFullName}
                  autoCapitalize="words"
                />

                {/* Patient Age */}
                <Text style={styles.inputLabel}>PATIENT AGE</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. 52"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  maxLength={3}
                  value={patientAge}
                  onChangeText={setPatientAge}
                />

                {/* Gender / Sex */}
                <Text style={styles.inputLabel}>GENDER</Text>
                <View style={styles.genderRow}>
                  {(['Male', 'Female', 'Other'] as const).map((gender) => {
                    const isSelected = patientGender === gender;
                    return (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderOption,
                          isSelected && styles.genderOptionSelected,
                        ]}
                        onPress={() => setPatientGender(gender)}
                      >
                        <Text
                          style={[
                            styles.genderOptionText,
                            isSelected && styles.genderOptionTextSelected,
                          ]}
                        >
                          {gender}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Diabetes History */}
                <Text style={styles.inputLabel}>KNOWN DIABETES HISTORY</Text>
                <View style={styles.genderRow}>
                  {(['Yes', 'Not sure'] as const).map((status) => {
                    const isSelected = patientDiabetes === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.genderOption,
                          isSelected && styles.genderOptionSelected,
                        ]}
                        onPress={() => setPatientDiabetes(status)}
                      >
                        <Text
                          style={[
                            styles.genderOptionText,
                            isSelected && styles.genderOptionTextSelected,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.submitAnalysisBtn}
                  activeOpacity={0.85}
                  onPress={handleSubmitPatientDetails}
                >
                  <Text style={styles.submitAnalysisBtnText}>Analyse</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* 'Analyzing retina' Screen (Dark HUD Fullscreen Overlay) */}
      {isAnalyzing && (
        <View style={styles.analyzingOverlay}>
          {/* Subtle background fundus watermark */}
          <View style={styles.watermarkContainer}>
            <Image
              source={require('../../assets/fundus_sample.jpg')}
              style={styles.watermarkImage}
              resizeMode="cover"
            />
          </View>

          {/* Central Target / Reticle Graphic */}
          <View style={styles.analyzingCenterContent}>
            <View style={styles.reticleBadgeOuter}>
              <View style={styles.reticleBadgeInner}>
                <MaterialCommunityIcons name="target" size={28} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.analyzingMainTitle}>Analyzing retina</Text>
            <Text style={styles.analyzingSubtitle}>Analyzing retinal features</Text>

            {/* Checklist of steps */}
            <View style={styles.stepsContainer}>
              {/* Step 1: Checking image */}
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCheckCircle,
                    analysisStep >= 1 ? styles.stepCheckCircleActive : styles.stepCheckCircleInactive,
                  ]}
                >
                  <Ionicons name="checkmark" size={13} color="#ffffff" />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    analysisStep >= 1 ? styles.stepLabelActive : styles.stepLabelInactive,
                  ]}
                >
                  Checking image
                </Text>
                {analysisStep >= 1 && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
              </View>

              {/* Step 2: Analyzing retina */}
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCheckCircle,
                    analysisStep >= 2 ? styles.stepCheckCircleActive : styles.stepCheckCircleInactive,
                  ]}
                >
                  <Ionicons name="checkmark" size={13} color="#ffffff" />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    analysisStep >= 2 ? styles.stepLabelActive : styles.stepLabelInactive,
                  ]}
                >
                  Analyzing retina
                </Text>
                {analysisStep >= 2 && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
              </View>

              {/* Step 3: Looking for signs of diabetic retinopathy */}
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCheckCircle,
                    analysisStep >= 3 ? styles.stepCheckCircleActive : styles.stepCheckCircleInactive,
                  ]}
                >
                  <Ionicons name="checkmark" size={13} color="#ffffff" />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    analysisStep >= 3 ? styles.stepLabelActive : styles.stepLabelInactive,
                  ]}
                >
                  Looking for signs of diabetic{'\n'}retinopathy
                </Text>
                {analysisStep >= 3 && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
              </View>

              {/* Step 4: Preparing result */}
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepCheckCircle,
                    analysisStep >= 4 ? styles.stepCheckCircleActive : styles.stepCheckCircleInactive,
                  ]}
                >
                  <Ionicons name="checkmark" size={13} color="#ffffff" />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    analysisStep >= 4
                      ? styles.stepLabelActive
                      : analysisStep === 3
                      ? styles.stepLabelInProgress
                      : styles.stepLabelInactive,
                  ]}
                >
                  Preparing result
                </Text>
                {analysisStep >= 4 ? (
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                ) : analysisStep === 3 ? (
                  <Text style={styles.stepStatusProgress}>...</Text>
                ) : null}
              </View>
            </View>

            {/* Skip to result link */}
            <TouchableOpacity
              style={styles.skipButton}
              activeOpacity={0.7}
              onPress={handleSkipAnalysis}
            >
              <Text style={styles.skipButtonText}>Skip to result</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Analysis Complete Modal */}
      {analysisComplete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCheckCircle}>
              <Ionicons name="checkmark-sharp" size={36} color="#10b981" />
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
              <Ionicons name="document-text-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.modalPrimaryText}>View Full Report</Text>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
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
    backgroundColor: colors.primaryMuted,
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
    opacity: 1,
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
  // Patient details modal styles
  formModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    elevation: 20,
  },
  formModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  formModalKeyboardAvoid: {
    width: '100%',
  },
  formModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  formModalBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 4,
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  formModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formModalCloseText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  formModalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#f8fafc',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  genderOption: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  genderOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitAnalysisBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitAnalysisBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  // 'Analyzing retina' Fullscreen HUD styles
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#090e17',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  watermarkContainer: {
    position: 'absolute',
    top: '18%',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.08,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  analyzingCenterContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  reticleBadgeOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(13, 148, 136, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  reticleBadgeInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  reticleIcon: {
    fontSize: 28,
  },
  analyzingMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontSize: 14.5,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 36,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 44,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepCheckCircleActive: {
    backgroundColor: '#10b981',
  },
  stepCheckCircleInactive: {
    backgroundColor: '#1e293b',
  },
  stepCheckIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepLabelActive: {
    color: '#f8fafc',
  },
  stepLabelInProgress: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  stepLabelInactive: {
    color: '#475569',
  },
  stepStatusTick: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
    marginLeft: 8,
  },
  stepStatusProgress: {
    fontSize: 16,
    color: '#38bdf8',
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
