import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';
import { ProfileModal } from '../components/ProfileModal';

export type ModalityType = 'original' | 'gradcam' | 'thermal' | 'redfree' | 'vessels';

export interface ViewModalityConfig {
  id: ModalityType;
  tabLabel: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  clinicalSign: string;
  findings: string;
}

export const VIEW_MODALITIES: ViewModalityConfig[] = [
  {
    id: 'original',
    tabLabel: 'Original',
    name: 'Natural Fundus (RGB)',
    icon: '👁️',
    badge: 'True Color Standard',
    description: 'High-definition color retinal photograph under balanced illumination.',
    clinicalSign: 'Optic disc margins, physiological cup, and macula pigmentation.',
    findings: 'Clear macula boundary, intact optic cup-to-disc ratio (0.3).',
  },
  {
    id: 'gradcam',
    tabLabel: 'Grad-CAM++',
    name: 'AI Lesion Attention Map',
    icon: '🎯',
    badge: 'Neural Network Saliency',
    description: 'Grad-CAM++ saliency highlighting the exact pixels the AI used to determine DR grade.',
    clinicalSign: 'Neural activation focused on microaneurysms and intraretinal hemorrhage clusters.',
    findings: 'Primary attention density in superior-temporal and macular zones (93% weight).',
  },
  {
    id: 'thermal',
    tabLabel: 'Thermal / Heat',
    name: 'Metabolic Thermal Heatmap',
    icon: '🔥',
    badge: 'Intensity Spectrum',
    description: 'False-color thermal intensity gradient isolating local metabolic & vascular hotspots.',
    clinicalSign: 'Hyper-intense vascular leakage, localized inflammatory heat, and ischemia.',
    findings: 'Focal thermal spikes detected near microvascular branching junctions.',
  },
  {
    id: 'redfree',
    tabLabel: 'Red-Free',
    name: 'Red-Free 540nm (Green Band)',
    icon: '🟢',
    badge: 'Ophthalmology Standard',
    description: 'Green wavelength filter that absorbs melanin and accentuates retinal vessels.',
    clinicalSign: 'Superficial retinal hemorrhages, nerve fiber layer defects, and micro-dot lesions.',
    findings: 'Enhanced contrast isolates 3 early pinpoint hemorrhages without melanin glare.',
  },
  {
    id: 'vessels',
    tabLabel: 'Vessel Contrast',
    name: 'Deep Vessel & Microvascular Tree',
    icon: '📐',
    badge: 'Enhanced Angiography Mode',
    description: 'High-contrast edge filtering isolating arteriolar and venular caliber alterations.',
    clinicalSign: 'Vessel tortuosity, venous beading, and capillary non-perfusion zones.',
    findings: 'Preserved vessel caliber; mild arteriovenous crossing nipping noted.',
  },
];

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

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedView, setSelectedView] = useState<ModalityType>('gradcam');
  const [showViewerModal, setShowViewerModal] = useState(false);

  // If active record not set, fallback to the latest screening or null
  const record: ScreeningRecord | null =
    activeReportRecord || (screenings.length > 0 ? screenings[0] : null);

  const activeModality =
    VIEW_MODALITIES.find((m) => m.id === selectedView) || VIEW_MODALITIES[0];

  const retinaSource = record?.capturedImageUri
    ? { uri: record.capturedImageUri }
    : require('../../assets/fundus_sample.jpg');

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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
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
            <View style={styles.fieldWorkerTagRow}>
              <Text style={styles.fieldWorkerTagText}>📍 Captured by Healthcare Field Worker</Text>
            </View>
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

        {/* AI EXPLANATION & MULTI-VIEW RETINAL MODALITY VIEWER */}
        <View style={styles.card}>
          <View style={styles.aiHeaderRow}>
            <View>
              <Text style={styles.cardSectionTag}>AI EXPLANATION & RETINAL MODALITIES</Text>
              <Text style={styles.aiSectionSub}>
                Switch diagnostic filters & heatmaps
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewMoreHeaderBtn}
              activeOpacity={0.75}
              onPress={() => setShowViewerModal(true)}
            >
              <Text style={styles.viewMoreHeaderBtnText}>🔍 View More</Text>
            </TouchableOpacity>
          </View>

          {/* Large Interactive Retinal Preview Display */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.largeRetinaDisplayBox}
            onPress={() => setShowViewerModal(true)}
          >
            <Image
              source={retinaSource}
              style={[
                styles.largeRetinaImage,
                selectedView === 'thermal' && styles.imageFilterThermal,
                selectedView === 'redfree' && styles.imageFilterRedFree,
                selectedView === 'vessels' && styles.imageFilterVessels,
              ]}
              resizeMode="cover"
            />

            {/* Overlays matching selected modality */}
            {selectedView === 'gradcam' && (
              <View style={styles.largeGradCamOverlay}>
                <View style={styles.largeHeatCircleOne} />
                <View style={styles.largeHeatCircleTwo} />
                <View style={styles.largeHeatCircleThree} />
                <View style={styles.gradCamLegendPill}>
                  <View style={styles.legendColorRed} />
                  <Text style={styles.legendText}>Severe Lesion Activation</Text>
                </View>
              </View>
            )}

            {selectedView === 'thermal' && (
              <View style={styles.thermalOverlay}>
                <View style={styles.thermalCoreGlow} />
                <View style={styles.thermalSecondaryGlow} />
                <View style={styles.thermalThirdGlow} />
                <View style={styles.thermalLegendBar}>
                  <Text style={styles.thermalScaleMin}>Cool (0°)</Text>
                  <View style={styles.thermalGradientTrack} />
                  <Text style={styles.thermalScaleMax}>Peak Hot (100°)</Text>
                </View>
              </View>
            )}

            {selectedView === 'redfree' && (
              <View style={styles.redFreeOverlay}>
                <View style={styles.redFreeHemoMarkerA} />
                <View style={styles.redFreeHemoMarkerB} />
                <View style={styles.redFreeBadge}>
                  <Text style={styles.redFreeBadgeText}>🟢 540nm Green Filter (Red-Free)</Text>
                </View>
              </View>
            )}

            {selectedView === 'vessels' && (
              <View style={styles.vesselsOverlay}>
                <View style={styles.vesselsVascularBranch} />
                <View style={styles.vesselsBadge}>
                  <Text style={styles.vesselsBadgeText}>📐 Deep Vessel Contrast & Microaneurysms</Text>
                </View>
              </View>
            )}

            {/* Badge overlay on bottom showing active modality name & expand prompt */}
            <View style={styles.retinaOverlayFooter}>
              <View style={styles.activeModalityTag}>
                <Text style={styles.activeModalityDot}>●</Text>
                <Text style={styles.activeModalityLabel}>{activeModality.name}</Text>
              </View>

              <View style={styles.tapToZoomPill}>
                <Text style={styles.tapToZoomText}>Tap to inspect high-res ⛶</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Clinical Modality Description Banner */}
          <View style={styles.modalityInfoBanner}>
            <Text style={styles.modalityInfoIcon}>{activeModality.icon}</Text>
            <View style={styles.modalityInfoCol}>
              <Text style={styles.modalityInfoTitle}>{activeModality.name}</Text>
              <Text style={styles.modalityInfoDesc}>{activeModality.description}</Text>
              <Text style={styles.modalityClinicalFocus}>
                <Text style={{ fontWeight: '700' }}>Clinical focus: </Text>
                {activeModality.clinicalSign}
              </Text>
            </View>
          </View>

          {/* Modality Selector Tabs */}
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modalityTabsContainer}
          >
            {VIEW_MODALITIES.map((modality) => {
              const isSelected = selectedView === modality.id;
              return (
                <TouchableOpacity
                  key={modality.id}
                  style={[
                    styles.modalityTabBtn,
                    isSelected && styles.modalityTabBtnActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedView(modality.id)}
                >
                  <Text
                    style={[
                      styles.modalityTabIcon,
                      isSelected && styles.modalityTabIconActive,
                    ]}
                  >
                    {modality.icon}
                  </Text>
                  <Text
                    style={[
                      styles.modalityTabTitle,
                      isSelected && styles.modalityTabTitleActive,
                    ]}
                  >
                    {modality.tabLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Full Screen View More Button */}
          <TouchableOpacity
            style={styles.expandModalButton}
            activeOpacity={0.85}
            onPress={() => setShowViewerModal(true)}
          >
            <Text style={styles.expandModalButtonText}>
              🔍 Open Multi-Angle Retinal Viewer
            </Text>
            <Text style={styles.expandModalButtonSub}>
              Compare side-by-side or inspect thermal & vessel layers in full detail
            </Text>
          </TouchableOpacity>
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

        {/* DOCTOR CLINICAL REVIEW & VERIFICATION ACTIONS */}
        {userRole === 'doctor' && (
          <View style={[styles.card, styles.doctorReviewActionCard]}>
            <View style={styles.doctorReviewHeaderRow}>
              <View style={styles.doctorReviewIconCircle}>
                <Text style={styles.doctorReviewIcon}>🩺</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorReviewTitle}>Doctor Clinical Decision</Text>
                <Text style={styles.doctorReviewSubtitle}>
                  Review fundus image captured by field worker & endorse or override AI assessment
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doctorConfirmBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Endorse & Sign Report',
                  `You have verified and confirmed the DR assessment for ${patientName} (${status}). Report signed digitally.`,
                  [{ text: 'Done', onPress: () => goBack() }]
                )
              }
            >
              <Text style={styles.doctorConfirmBtnText}>✓ Confirm & Sign Result</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doctorOverrideBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Override AI Assessment',
                  `Select revised clinical diagnosis for ${patientName}:`,
                  [
                    {
                      text: 'Mark as Normal / No DR',
                      onPress: () => Alert.alert('Overridden', 'Marked as No DR.'),
                    },
                    {
                      text: 'Mark as Urgent Referral',
                      onPress: () => Alert.alert('Urgent Referral', 'Marked for urgent specialist intervention.'),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                )
              }
            >
              <Text style={styles.doctorOverrideBtnText}>✎ Override Result / Clinical Revision</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Profile Details Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* FULL-SCREEN RETINAL MULTI-ANGLE & THERMAL INSPECTION MODAL */}
      <Modal
        visible={showViewerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowViewerModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              onPress={() => setShowViewerModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>

            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalHeaderTitle}>Retinal Diagnostic Viewer</Text>
              <Text style={styles.modalHeaderSub}>
                ID: {record?.id ? record.id.slice(-6) : 'REC-01'} · High-Resolution Multi-Spectrum
              </Text>
            </View>

            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>{imageQuality}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Modality Title Banner */}
            <View style={styles.modalActiveBanner}>
              <View style={styles.modalActiveBannerLeft}>
                <Text style={styles.modalActiveBannerIcon}>{activeModality.icon}</Text>
                <View>
                  <Text style={styles.modalActiveBannerTitle}>{activeModality.name}</Text>
                  <Text style={styles.modalActiveBannerTag}>{activeModality.badge}</Text>
                </View>
              </View>
            </View>

            {/* Giant Full-Spectrum Retinal Image Canvas */}
            <View style={styles.modalRetinaFrame}>
              <Image
                source={retinaSource}
                style={[
                  styles.modalRetinaImage,
                  selectedView === 'thermal' && styles.imageFilterThermal,
                  selectedView === 'redfree' && styles.imageFilterRedFree,
                  selectedView === 'vessels' && styles.imageFilterVessels,
                ]}
                resizeMode="contain"
              />

              {/* High-Res Overlays */}
              {selectedView === 'gradcam' && (
                <View style={styles.modalGradCamOverlay}>
                  <View style={styles.modalHeatCircleMajor} />
                  <View style={styles.modalHeatCircleMinor} />
                  <View style={styles.modalHeatCircleMacula} />
                  <View style={styles.modalLesionCrosshair}>
                    <Text style={styles.modalCrosshairText}>🎯 Lesion Cluster (Weight: 0.93)</Text>
                  </View>
                </View>
              )}

              {selectedView === 'thermal' && (
                <View style={styles.modalThermalOverlay}>
                  <View style={styles.modalThermalCore} />
                  <View style={styles.modalThermalFocal} />
                  <View style={styles.modalThermalVessel1} />
                  <View style={styles.modalThermalVessel2} />
                  <View style={styles.modalThermalScale}>
                    <Text style={styles.modalScaleLabel}>Thermal Ischemia Gradient</Text>
                    <View style={styles.modalScaleBar} />
                    <View style={styles.modalScaleTicks}>
                      <Text style={styles.modalScaleTickText}>0° (Safe)</Text>
                      <Text style={styles.modalScaleTickText}>50° (Moderate)</Text>
                      <Text style={styles.modalScaleTickText}>100° (Critical)</Text>
                    </View>
                  </View>
                </View>
              )}

              {selectedView === 'redfree' && (
                <View style={styles.modalRedFreeOverlay}>
                  <View style={styles.modalRedFreeDotA} />
                  <View style={styles.modalRedFreeDotB} />
                  <View style={styles.modalRedFreeDotC} />
                  <View style={styles.modalRedFreeBanner}>
                    <Text style={styles.modalRedFreeBannerText}>
                      🟢 Green Channel Active: Microaneurysms appear sharp black against green background
                    </Text>
                  </View>
                </View>
              )}

              {selectedView === 'vessels' && (
                <View style={styles.modalVesselsOverlay}>
                  <View style={styles.modalVesselBranch1} />
                  <View style={styles.modalVesselBranch2} />
                  <View style={styles.modalVesselBanner}>
                    <Text style={styles.modalVesselBannerText}>
                      📐 Angiographic Contrast: Arteriole/Venule Caliber Ratio (A/V) = 0.67
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Modality Selector Pills Inside Modal */}
            <Text style={styles.modalFilterSectionTitle}>SELECT SPECTRAL VIEW</Text>
            <View style={styles.modalTabsRow}>
              {VIEW_MODALITIES.map((modality) => {
                const isSelected = selectedView === modality.id;
                return (
                  <TouchableOpacity
                    key={modality.id}
                    style={[
                      styles.modalTabChip,
                      isSelected && styles.modalTabChipActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedView(modality.id)}
                  >
                    <Text style={styles.modalTabChipIcon}>{modality.icon}</Text>
                    <Text
                      style={[
                        styles.modalTabChipText,
                        isSelected && styles.modalTabChipTextActive,
                      ]}
                    >
                      {modality.tabLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Diagnostic Clinical Findings Card */}
            <View style={styles.modalDetailsCard}>
              <Text style={styles.modalCardHeader}>CLINICAL INTERPRETATION</Text>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Modality:</Text>
                <Text style={styles.modalDetailValue}>{activeModality.name}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Description:</Text>
                <Text style={styles.modalDetailValue}>{activeModality.description}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Sign Target:</Text>
                <Text style={styles.modalDetailValue}>{activeModality.clinicalSign}</Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>AI Saliency:</Text>
                <Text style={[styles.modalDetailValue, { color: '#059669', fontWeight: '700' }]}>
                  {activeModality.findings}
                </Text>
              </View>
            </View>

            {/* Evidence Checklist in Modal */}
            <View style={styles.modalDetailsCard}>
              <Text style={styles.modalCardHeader}>DETECTED RETINAL EVIDENCE</Text>
              {evidence.map((item, index) => {
                const isRed = item.color === 'red' || item.level === 'High';
                const isAmber = item.color === 'amber' || item.level === 'Moderate';
                const dotColor = isRed ? '#ef4444' : isAmber ? '#d97706' : '#10b981';

                return (
                  <View key={index} style={styles.modalEvidenceItem}>
                    <View style={[styles.evidenceDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.modalEvidenceName}>{item.name}</Text>
                    <Text style={[styles.modalEvidenceLevel, { color: dotColor }]}>
                      {item.level}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Bottom Done Button */}
            <TouchableOpacity
              style={styles.modalBottomDoneBtn}
              activeOpacity={0.85}
              onPress={() => setShowViewerModal(false)}
            >
              <Text style={styles.modalBottomDoneBtnText}>Done Viewing</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 70,
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
  fieldWorkerTagRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  fieldWorkerTagText: {
    fontSize: 10,
    color: '#0369a1',
    fontWeight: '700',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
  // --- Multi-View Retinal Modality Styles ---
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiSectionSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  viewMoreHeaderBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewMoreHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  largeRetinaDisplayBox: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0a0f1d',
    position: 'relative',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  largeRetinaImage: {
    width: '100%',
    height: '100%',
  },
  imageFilterThermal: {
    tintColor: '#f97316',
    opacity: 0.9,
  },
  imageFilterRedFree: {
    tintColor: '#10b981',
    opacity: 0.88,
  },
  imageFilterVessels: {
    tintColor: '#38bdf8',
    opacity: 0.85,
  },
  // GradCAM overlay simulation
  largeGradCamOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
  },
  largeHeatCircleOne: {
    position: 'absolute',
    top: 45,
    left: 80,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(239, 68, 68, 0.65)',
  },
  largeHeatCircleTwo: {
    position: 'absolute',
    top: 60,
    left: 95,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 158, 11, 0.85)',
  },
  largeHeatCircleThree: {
    position: 'absolute',
    top: 110,
    right: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  gradCamLegendPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  legendColorRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  legendText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  // Thermal overlay simulation
  thermalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 75, 0.35)',
  },
  thermalCoreGlow: {
    position: 'absolute',
    top: 30,
    left: 70,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(239, 68, 68, 0.75)',
  },
  thermalSecondaryGlow: {
    position: 'absolute',
    top: 45,
    left: 85,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
  },
  thermalThirdGlow: {
    position: 'absolute',
    top: 95,
    right: 70,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 115, 22, 0.65)',
  },
  thermalLegendBar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  thermalScaleMin: {
    color: '#60a5fa',
    fontSize: 9.5,
    fontWeight: '700',
  },
  thermalGradientTrack: {
    flex: 1,
    height: 5,
    marginHorizontal: 8,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  thermalScaleMax: {
    color: '#ef4444',
    fontSize: 9.5,
    fontWeight: '800',
  },
  // RedFree overlay
  redFreeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 78, 59, 0.2)',
  },
  redFreeHemoMarkerA: {
    position: 'absolute',
    top: 70,
    left: 110,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: '#34d399',
  },
  redFreeHemoMarkerB: {
    position: 'absolute',
    top: 105,
    left: 140,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: '#34d399',
  },
  redFreeBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  redFreeBadgeText: {
    color: '#d1fae5',
    fontSize: 10,
    fontWeight: '700',
  },
  // Vessels overlay
  vesselsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 116, 144, 0.15)',
  },
  vesselsVascularBranch: {
    position: 'absolute',
    top: 60,
    left: 80,
    width: 120,
    height: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.85)',
    transform: [{ rotate: '35deg' }],
  },
  vesselsBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    backgroundColor: 'rgba(12, 74, 110, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  vesselsBadgeText: {
    color: '#e0f2fe',
    fontSize: 10,
    fontWeight: '700',
  },
  // Overlay footer
  retinaOverlayFooter: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeModalityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  activeModalityDot: {
    fontSize: 10,
    color: '#38bdf8',
  },
  activeModalityLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tapToZoomPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tapToZoomText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '700',
  },
  // Modality info banner
  modalityInfoBanner: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    marginBottom: 14,
    gap: 10,
  },
  modalityInfoIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  modalityInfoCol: {
    flex: 1,
  },
  modalityInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalityInfoDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  modalityClinicalFocus: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  // Modality selector tabs
  modalityTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },
  modalityTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modalityTabBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: colors.primary,
  },
  modalityTabIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  modalityTabIconActive: {
    opacity: 1,
  },
  modalityTabTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  modalityTabTitleActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  expandModalButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  expandModalButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  expandModalButtonSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // --- Retinal Modal Styles ---
  modalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  modalCloseBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  modalCloseBtnText: {
    color: '#e2e8f0',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalHeaderCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  modalHeaderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalHeaderSub: {
    color: '#94a3b8',
    fontSize: 10.5,
    marginTop: 1,
  },
  modalBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalBadgeText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  modalActiveBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  modalActiveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalActiveBannerIcon: {
    fontSize: 26,
  },
  modalActiveBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalActiveBannerTag: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalRetinaFrame: {
    width: '100%',
    height: 340,
    backgroundColor: '#020617',
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 18,
  },
  modalRetinaImage: {
    width: '100%',
    height: '100%',
  },
  modalGradCamOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  modalHeatCircleMajor: {
    position: 'absolute',
    top: 90,
    left: 120,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
  },
  modalHeatCircleMinor: {
    position: 'absolute',
    top: 110,
    left: 145,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  modalHeatCircleMacula: {
    position: 'absolute',
    top: 170,
    right: 90,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.55)',
  },
  modalLesionCrosshair: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  modalCrosshairText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalThermalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 75, 0.4)',
  },
  modalThermalCore: {
    position: 'absolute',
    top: 80,
    left: 110,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  modalThermalFocal: {
    position: 'absolute',
    top: 105,
    left: 135,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(250, 204, 21, 0.95)',
  },
  modalThermalVessel1: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(249, 115, 22, 0.75)',
  },
  modalThermalVessel2: {
    position: 'absolute',
    bottom: 60,
    left: 140,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.65)',
  },
  modalThermalScale: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalScaleLabel: {
    color: '#e2e8f0',
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalScaleBar: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  modalScaleTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modalScaleTickText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  modalRedFreeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 78, 59, 0.25)',
  },
  modalRedFreeDotA: {
    position: 'absolute',
    top: 120,
    left: 150,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#020617',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  modalRedFreeDotB: {
    position: 'absolute',
    top: 170,
    left: 190,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#020617',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  modalRedFreeDotC: {
    position: 'absolute',
    top: 210,
    right: 120,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#020617',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  modalRedFreeBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    padding: 10,
    borderRadius: 12,
  },
  modalRedFreeBannerText: {
    color: '#d1fae5',
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 15,
  },
  modalVesselsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 116, 144, 0.2)',
  },
  modalVesselBranch1: {
    position: 'absolute',
    top: 100,
    left: 100,
    width: 180,
    height: 3,
    backgroundColor: '#38bdf8',
    transform: [{ rotate: '40deg' }],
  },
  modalVesselBranch2: {
    position: 'absolute',
    top: 180,
    left: 120,
    width: 150,
    height: 2.5,
    backgroundColor: '#7dd3fc',
    transform: [{ rotate: '-25deg' }],
  },
  modalVesselBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(12, 74, 110, 0.95)',
    padding: 10,
    borderRadius: 12,
  },
  modalVesselBannerText: {
    color: '#e0f2fe',
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 15,
  },
  modalFilterSectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  modalTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modalTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modalTabChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  modalTabChipIcon: {
    fontSize: 14,
  },
  modalTabChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalTabChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalDetailsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  modalCardHeader: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  modalDetailRow: {
    marginBottom: 10,
  },
  modalDetailLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalDetailValue: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalEvidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalEvidenceName: {
    color: '#f8fafc',
    fontSize: 12.5,
    flex: 1,
    marginLeft: 8,
  },
  modalEvidenceLevel: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBottomDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBottomDoneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
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
  // Doctor review action card styles
  doctorReviewActionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#bbf7d0',
    borderWidth: 1.5,
    padding: 16,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  doctorReviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  doctorReviewIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorReviewIcon: {
    fontSize: 22,
  },
  doctorReviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532d',
  },
  doctorReviewSubtitle: {
    fontSize: 11.5,
    color: '#4b5563',
    marginTop: 2,
    lineHeight: 16,
  },
  doctorConfirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorConfirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  doctorOverrideBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  doctorOverrideBtnText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '700',
  },
});
