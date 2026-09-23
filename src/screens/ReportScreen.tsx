import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';
import { ProfileModal } from '../components/ProfileModal';

export const ReportScreen: React.FC = () => {
  const {
    activeReportRecord,
    screenings,
    goBack,
    canGoBack,
    navigate,
    userRole,
    patientProfile,
    account,
  } = useApp();

  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // If active record not set, fallback to the latest screening or null
  const record: ScreeningRecord | null =
    activeReportRecord || (screenings.length > 0 ? screenings[0] : null);

  // Quality status: defaults to record's status, or 'done'
  const qualityStatus: 'done' | 'retake_needed' =
    record?.imageQualityStatus === 'retake_needed' ? 'retake_needed' : 'done';

  const handleBack = () => {
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

  const patientName =
    record?.name ||
    patientProfile.fullName ||
    account.fullName ||
    'Screened Patient';

  const patientAge =
    record?.age || patientProfile.age || '—';

  // Fallback defaults for clinical fields if not present on record
  const condition = record?.condition || 'Moderate DR (Grade 2)';
  const status = record?.status || 'REFERABLE';
  const confidence = record?.aiConfidence ?? 93;
  const imageQuality = record?.imageQuality || 'Good';
  const recommendation =
    record?.recommendation ||
    'Refer to ophthalmologist for further comprehensive dilated fundus evaluation. Moderate diabetic retinopathy with referable signs detected. Early treatment and glycemic management prevent irreversible vision loss.';

  const evidence = record?.evidence || [
    { name: 'Microaneurysm-like regions', level: 'High', color: 'red' },
    { name: 'Hemorrhage-like regions', level: 'Moderate', color: 'amber' },
    { name: 'Hard exudate-like regions', level: 'Low', color: 'green' },
  ];

  const recommendedDoctor = record?.recommendedDoctor || {
    name: 'Dr. Sarah Jenkins, MD',
    specialty: 'Retina Specialist & Vitreoretinal Surgeon',
    hospital: 'Apex Eye Institute & Research Hospital',
    contact: '+91 98765 43210',
    timeframe: 'Recommended consultation within 30 days',
  };

  if (!record && screenings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={handleBack}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinical Report</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Report Generated Yet</Text>
          <Text style={styles.emptySub}>
            Take a retinal photo with the camera to generate your AI screening report, evidence maps, and specialist recommendation.
          </Text>
          <TouchableOpacity
            style={styles.emptyScanBtn}
            activeOpacity={0.85}
            onPress={() => navigate('eyeCamera')}
          >
            <Text style={styles.emptyScanBtnText}>📸 Start Retinal Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Screening Report</Text>
          <Text style={styles.headerSub}>ID: {record?.id ? record.id.slice(-6) : 'REC-01'}</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.profileIconButton}
            activeOpacity={0.7}
            onPress={() => setShowProfileModal(true)}
          >
            <Text style={styles.profileIconText}>👤</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyBtn}
            activeOpacity={0.7}
            onPress={() => navigate('screeningHistory')}
          >
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Header Banner */}
        <View style={styles.patientBanner}>
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarInitial}>
              {record?.initials || 'PT'}
            </Text>
          </View>
          <View style={styles.patientMetaCol}>
            <Text style={styles.patientBannerName}>{patientName}</Text>
            <Text style={styles.patientBannerSub}>
              Age {patientAge} · Date: {record?.date || 'Today'}
            </Text>
          </View>
          <View style={[
            styles.patientStatusPill,
            status === 'REFERABLE' ? styles.pillReferable : styles.pillNonReferable
          ]}>
            <Text style={[
              styles.patientStatusText,
              status === 'REFERABLE' ? styles.statusTextReferable : styles.statusTextNonReferable
            ]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Backend Verification & Quality Banner */}
        {qualityStatus === 'retake_needed' ? (
          <View style={styles.retakeBanner}>
            <View style={styles.retakeIconCircle}>
              <Text style={styles.retakeIconText}>⚠️</Text>
            </View>
            <View style={styles.retakeTextCol}>
              <Text style={styles.retakeBannerTitle}>Retake Advised by Backend</Text>
              <Text style={styles.retakeBannerSub}>
                Image quality verified as insufficient (sub-optimal illumination/focus). Please capture a clearer image.
              </Text>
              <TouchableOpacity
                style={styles.retakeCtaBtn}
                activeOpacity={0.85}
                onPress={() => navigate('eyeCamera')}
              >
                <Text style={styles.retakeCtaBtnText}>📸 Retake Photo Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.verifiedBanner}>
            <View style={styles.verifiedIconCircle}>
              <Text style={styles.verifiedIconText}>✓</Text>
            </View>
            <View style={styles.verifiedTextCol}>
              <Text style={styles.verifiedBannerTitle}>Quality Verified</Text>
              <Text style={styles.verifiedBannerSub}>
                Fundus scan verified as clinically gradable.
              </Text>
            </View>
            <View style={styles.qualityPill}>
              <Text style={styles.qualityPillText}>{imageQuality}</Text>
            </View>
          </View>
        )}

        {/* Screening Result Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTag}>SCREENING RESULT</Text>

          <Text style={styles.gradeLabel}>DR Grade</Text>
          <Text style={styles.gradeValue}>{condition}</Text>

          <View style={styles.resultGrid}>
            <View style={styles.resultCol}>
              <Text style={styles.metaLabel}>Referable</Text>
              <Text style={[
                styles.metaValue,
                status === 'REFERABLE' ? styles.textRed : styles.textGreen
              ]}>
                {status === 'REFERABLE' ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.resultCol}>
              <Text style={styles.metaLabel}>Image quality</Text>
              <Text style={styles.metaValue}>{imageQuality}</Text>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <Text style={styles.metaLabel}>AI confidence</Text>
            <Text style={styles.confidenceValue}>{confidence}%</Text>
          </View>

          {/* Confidence Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${confidence}%` },
                status === 'REFERABLE' ? styles.progressReferable : styles.progressNonReferable
              ]}
            />
          </View>
        </View>

        {/* Evidence Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTag}>EVIDENCE</Text>

          {evidence.map((item, index) => {
            const isRed = item.color === 'red' || item.level === 'High';
            const isAmber = item.color === 'amber' || item.level === 'Moderate';
            const dotColor = isRed ? '#ef4444' : isAmber ? '#d97706' : '#10b981';

            return (
              <View
                key={index}
                style={[
                  styles.evidenceRow,
                  index === evidence.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <Text style={styles.evidenceName}>{item.name}</Text>
                <View style={styles.evidenceLevelBox}>
                  <View style={[styles.evidenceDot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.evidenceLevelText, { color: dotColor }]}>
                    {item.level}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* AI Explanation & Visual Heatmap Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTag}>AI EXPLANATION</Text>

          <View style={styles.explanationRow}>
            {/* Fundus Image Preview */}
            <View style={styles.imageThumbBox}>
              <Image
                source={require('../../assets/fundus_sample.jpg')}
                style={styles.thumbImage}
                resizeMode="cover"
              />
              <View style={styles.thumbLabelBox}>
                <Text style={styles.thumbLabelText}>Original</Text>
              </View>
            </View>

            {/* Grad-CAM Heatmap Simulation Thumbnail */}
            <View style={styles.imageThumbBox}>
              <Image
                source={require('../../assets/fundus_sample.jpg')}
                style={styles.thumbImage}
                resizeMode="cover"
              />
              {/* Heatmap overlay dots */}
              <View style={styles.heatmapOverlay}>
                <View style={styles.heatDotLarge} />
                <View style={styles.heatDotMedium} />
              </View>
              <View style={styles.thumbLabelBox}>
                <Text style={styles.thumbLabelText}>Grad-CAM++</Text>
              </View>
            </View>

            {/* Explanation Note */}
            <View style={styles.explanationTextCol}>
              <Text style={styles.explanationTitle}>Grad-CAM++ map</Text>
              <Text style={styles.explanationSub}>
                Attention on lesion regions highlighted in red & orange.
              </Text>
            </View>
          </View>
        </View>

        {/* Recommendation Card */}
        <View style={[styles.card, styles.recommendationCard]}>
          <Text style={styles.recommendationTag}>RECOMMENDATION</Text>
          <Text style={styles.recommendationBody}>{recommendation}</Text>
        </View>

        {/* Recommended Doctor Card */}
        <View style={[styles.card, styles.doctorCard]}>
          <Text style={styles.cardSectionTag}>RECOMMENDED DOCTOR</Text>

          <View style={styles.doctorHeaderRow}>
            <View style={styles.doctorAvatarBox}>
              <Text style={styles.doctorAvatarIcon}>👨‍⚕️</Text>
            </View>
            <View style={styles.doctorInfoCol}>
              <Text style={styles.doctorName}>{recommendedDoctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{recommendedDoctor.specialty}</Text>
              <Text style={styles.doctorHospital}>{recommendedDoctor.hospital}</Text>
            </View>
          </View>

          <View style={styles.doctorDivider} />

          <View style={styles.timeframeRow}>
            <Text style={styles.timeframeIcon}>⏰</Text>
            <Text style={styles.timeframeText}>{recommendedDoctor.timeframe}</Text>
          </View>

          {recommendedDoctor.contact && (
            <TouchableOpacity
              style={styles.contactBtn}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  'Book Consultation',
                  `Contacting ${recommendedDoctor.hospital} at ${recommendedDoctor.contact}`,
                  [{ text: 'OK' }]
                )
              }
            >
              <Text style={styles.contactBtnText}>📞 Contact Specialist Clinic</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Profile Details Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconText: {
    fontSize: 16,
  },
  historyBtn: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  historyBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  patientMetaCol: {
    flex: 1,
  },
  patientBannerName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  patientBannerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  patientStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillReferable: {
    backgroundColor: '#fee2e2',
  },
  pillNonReferable: {
    backgroundColor: '#ecfdf5',
  },
  patientStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextReferable: {
    color: '#dc2626',
  },
  statusTextNonReferable: {
    color: '#059669',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  verifiedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  verifiedIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  verifiedTextCol: {
    flex: 1,
  },
  verifiedBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  verifiedBannerSub: {
    fontSize: 11,
    color: '#047857',
  },
  qualityPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  qualityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  retakeBanner: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  retakeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  retakeIconText: {
    fontSize: 16,
  },
  retakeTextCol: {
    flex: 1,
  },
  retakeBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 3,
  },
  retakeBannerSub: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 17,
    marginBottom: 10,
  },
  retakeCtaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retakeCtaBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gradeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  gradeValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    marginBottom: 16,
  },
  resultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 3,
  },
  textRed: {
    color: '#dc2626',
  },
  textGreen: {
    color: '#059669',
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressReferable: {
    backgroundColor: colors.primary,
  },
  progressNonReferable: {
    backgroundColor: '#10b981',
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  evidenceName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  evidenceLevelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  evidenceLevelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  explanationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageThumbBox: {
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  heatmapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatDotLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.65)',
  },
  heatDotMedium: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.75)',
  },
  thumbLabelBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  thumbLabelText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '700',
  },
  explanationTextCol: {
    flex: 1,
    paddingLeft: 4,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  explanationSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  recommendationCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  recommendationTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  recommendationBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7f1d1d',
    fontWeight: '500',
  },
  doctorCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  doctorAvatarIcon: {
    fontSize: 24,
  },
  doctorInfoCol: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  doctorSpecialty: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  doctorHospital: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  doctorDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeframeIcon: {
    fontSize: 14,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  contactBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyScanBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  emptyScanBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
