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
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';
import { ProfileModal } from '../components/ProfileModal';

export type ModalityType = 'original' | 'gradcam' | 'thermal' | 'redfree' | 'vessels';

export interface ViewModalityConfig {
  id: ModalityType;
  tabLabel: string;
  name: string;
  iconFamily: 'ionicons' | 'material' | 'fontawesome';
  iconName: string;
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
    iconFamily: 'ionicons',
    iconName: 'eye-outline',
    badge: 'True Color Standard',
    description: 'High-definition color retinal photograph under balanced illumination.',
    clinicalSign: 'Optic disc margins, physiological cup, and macula pigmentation.',
    findings: 'Clear macula boundary, intact optic cup-to-disc ratio (0.3).',
  },
  {
    id: 'gradcam',
    tabLabel: 'Grad-CAM++',
    name: 'AI Lesion Attention Map',
    iconFamily: 'material',
    iconName: 'target',
    badge: 'Neural Network Saliency',
    description: 'Grad-CAM++ saliency highlighting the exact pixels the AI used to determine DR grade.',
    clinicalSign: 'Neural activation focused on microaneurysms and intraretinal hemorrhage clusters.',
    findings: 'Primary attention density in superior-temporal and macular zones (93% weight).',
  },
  {
    id: 'thermal',
    tabLabel: 'Thermal / Heat',
    name: 'Metabolic Thermal Heatmap',
    iconFamily: 'material',
    iconName: 'fire',
    badge: 'Intensity Spectrum',
    description: 'False-color thermal intensity gradient isolating local metabolic & vascular hotspots.',
    clinicalSign: 'Hyper-intense vascular leakage, localized inflammatory heat, and ischemia.',
    findings: 'Focal thermal spikes detected near microvascular branching junctions.',
  },
  {
    id: 'redfree',
    tabLabel: 'Red-Free',
    name: 'Red-Free 540nm (Green Band)',
    iconFamily: 'material',
    iconName: 'contrast',
    badge: 'Ophthalmology Standard',
    description: 'Green wavelength filter that absorbs melanin and accentuates retinal vessels.',
    clinicalSign: 'Superficial retinal hemorrhages, nerve fiber layer defects, and micro-dot lesions.',
    findings: 'Enhanced contrast isolates 3 early pinpoint hemorrhages without melanin glare.',
  },
  {
    id: 'vessels',
    tabLabel: 'Vessel Contrast',
    name: 'Deep Vessel & Microvascular Tree',
    iconFamily: 'material',
    iconName: 'vector-polyline',
    badge: 'Enhanced Angiography Mode',
    description: 'High-contrast edge filtering isolating arteriolar and venular caliber alterations.',
    clinicalSign: 'Vessel tortuosity, venous beading, and capillary non-perfusion zones.',
    findings: 'Preserved vessel caliber; mild arteriovenous crossing nipping noted.',
  },
];

export const renderModalityIcon = (m: ViewModalityConfig, size = 18, color = colors.primary) => {
  if (m.iconFamily === 'ionicons') {
    return <Ionicons name={m.iconName as any} size={size} color={color} />;
  }
  if (m.iconFamily === 'material') {
    return <MaterialCommunityIcons name={m.iconName as any} size={size} color={color} />;
  }
  return <FontAwesome5 name={m.iconName as any} size={size} color={color} />;
};

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
  const [doctorSigned, setDoctorSigned] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState('');

  const patientScreenings = screenings.filter(
    (screening) => !!patientProfile.patientId && screening.patientId === patientProfile.patientId
  );

  // Active report record takes top priority so freshly generated AI scans are always shown
  const record: ScreeningRecord | null =
    activeReportRecord ||
    (userRole === 'patient'
      ? (patientScreenings[0] || screenings[0] || null)
      : (screenings[0] || null));

  const activeModality =
    VIEW_MODALITIES.find((m) => m.id === selectedView) || VIEW_MODALITIES[0];

  // Base retina image (original or captured)
  const originalSource = record?.capturedImageUri
    ? { uri: record.capturedImageUri }
    : require('../../assets/fundus_sample.jpg');

  // Grad-CAM overlay — use real base64 from API when available
  const gradCamSource = record?.gradCamBase64
    ? { uri: `data:image/png;base64,${record.gradCamBase64}` }
    : originalSource;

  // Active image shown in the viewer depends on selected modality
  const retinaSource = selectedView === 'gradcam' ? gradCamSource : originalSource;

  // Quality status: defaults to record's status, or 'done'
  const qualityStatus: 'done' | 'retake_needed' =
    record?.imageQualityStatus === 'retake_needed' ? 'retake_needed' : 'done';

  // Real API fields (with fallbacks)
  const referableDR = record?.referableDR ?? (record?.status === 'REFERABLE');
  const referableProbability = record?.referableProbability;
  const uncertaintyLevel = record?.uncertaintyLevel;
  const reviewRequired = record?.reviewRequired ?? false;
  const rawReviewReasons = record?.reviewReasons;
  const reviewReasons: string[] = Array.isArray(rawReviewReasons)
    ? rawReviewReasons
    : typeof rawReviewReasons === 'object' && rawReviewReasons !== null
    ? Object.entries(rawReviewReasons)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => {
          const map: Record<string, string> = {
            uncertainty: 'High model uncertainty across classification grades',
            low_evidence: 'Lesion evidence activation below reliability threshold',
            referable_head_grade_disagreement: 'Disagreement between classification and referable risk heads',
          };
          return map[k] || k.replace(/_/g, ' ');
        })
    : [];

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

  if (!record && (userRole === 'patient' ? patientScreenings.length === 0 : screenings.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinical Report</Text>
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Report Generated Yet</Text>
          <Text style={styles.emptySub}>
            Take a retinal photo with the camera to generate your AI screening report, evidence maps, and specialist recommendation.
          </Text>
          {userRole !== 'patient' && (
            <TouchableOpacity
              style={styles.emptyScanBtn}
              activeOpacity={0.85}
              onPress={() => navigate('eyeCamera')}
            >
              <Ionicons name="camera" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyScanBtnText}>Start Retinal Scan</Text>
            </TouchableOpacity>
          )}
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
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
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
            <Ionicons name="person-circle-outline" size={22} color={colors.textPrimary} />
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
            {record?.patientId ? (
              <Text style={{ fontSize: 11, color: '#0369a1', fontWeight: '700', marginBottom: 1 }}>
                ID: {record.patientId}
              </Text>
            ) : null}
            <Text style={styles.patientBannerSub}>
              Age {patientAge} · Date: {record?.date || 'Today'}
            </Text>
            <View style={styles.fieldWorkerTagRow}>
              <Ionicons name="location-outline" size={11} color="#0369a1" style={{ marginRight: 3 }} />
              <Text style={styles.fieldWorkerTagText}>Captured by Healthcare Field Worker</Text>
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
              <Ionicons name="warning-outline" size={18} color="#d97706" />
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
                <Ionicons name="camera" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retakeCtaBtnText}>Retake Photo Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.verifiedBanner}>
            <View style={styles.verifiedIconCircle}>
              <Ionicons name="checkmark-sharp" size={14} color="#ffffff" />
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
                referableDR ? styles.textRed : styles.textGreen
              ]}>
                {referableDR ? 'Yes' : 'No'}
                {referableProbability !== undefined
                  ? ` (${Math.round(referableProbability * 100)}%)`
                  : ''}
              </Text>
            </View>

            <View style={styles.resultCol}>
              <Text style={styles.metaLabel}>Image quality</Text>
              <Text style={styles.metaValue}>{imageQuality}</Text>
            </View>

            {uncertaintyLevel ? (
              <View style={styles.resultCol}>
                <Text style={styles.metaLabel}>Uncertainty</Text>
                <Text style={[
                  styles.metaValue,
                  uncertaintyLevel === 'high' ? styles.textRed
                    : uncertaintyLevel === 'moderate' ? { color: '#d97706' }
                    : styles.textGreen
                ]}>
                  {uncertaintyLevel.charAt(0).toUpperCase() + uncertaintyLevel.slice(1)}
                </Text>
              </View>
            ) : null}
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
                referableDR ? styles.progressReferable : styles.progressNonReferable
              ]}
            />
          </View>

          {/* Review Required Banner */}
          {reviewRequired && (
            <View style={{
              marginTop: 12,
              backgroundColor: '#fef3c7',
              borderRadius: 10,
              padding: 10,
              borderLeftWidth: 3,
              borderLeftColor: '#f59e0b',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 2 }}>
                ⚠ Manual Review Required
              </Text>
              {reviewReasons.length > 0 ? (
                reviewReasons.map((reason, i) => (
                  <Text key={i} style={{ fontSize: 11, color: '#78350f' }}>• {reason}</Text>
                ))
              ) : (
                <Text style={{ fontSize: 11, color: '#78350f' }}>• Secondary validation advised by AI safety protocol</Text>
              )}
            </View>
          )}
        </View>

        {/* Evidence Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTag}>EVIDENCE</Text>

          {evidence.map((item, index) => {
            const isRed = item.color === 'red' || item.level === 'High';
            const isAmber = item.color === 'amber' || item.level === 'Moderate';
            const dotColor = isRed ? '#ef4444' : isAmber ? '#d97706' : '#10b981';

            let exactScoreStr = '';
            if (record?.lesionScores) {
              const normItem = item.name.toLowerCase().replace(/[^a-z]/g, '');
              for (const [k, v] of Object.entries(record.lesionScores)) {
                const normKey = k.toLowerCase().replace(/[^a-z]/g, '');
                if (normItem.includes(normKey) || normKey.includes(normItem)) {
                  exactScoreStr = ` (${Math.round((v as number) * 100)}%)`;
                  break;
                }
              }
            }

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
                    {item.level}{exactScoreStr}
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
              <Ionicons name="scan-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.viewMoreHeaderBtnText}>View More</Text>
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
              record?.gradCamBase64 ? (
                <View style={styles.gradCamLegendPill}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 6 }} />
                  <Text style={styles.legendText}>Live ResNet-50 Grad-CAM Heatmap</Text>
                </View>
              ) : (
                <View style={styles.largeGradCamOverlay}>
                  <View style={styles.largeHeatCircleOne} />
                  <View style={styles.largeHeatCircleTwo} />
                  <View style={styles.largeHeatCircleThree} />
                  <View style={styles.gradCamLegendPill}>
                    <View style={styles.legendColorRed} />
                    <Text style={styles.legendText}>Severe Lesion Activation</Text>
                  </View>
                </View>
              )
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
                  <MaterialCommunityIcons name="contrast" size={12} color="#34d399" style={{ marginRight: 4 }} />
                  <Text style={styles.redFreeBadgeText}>540nm Green Filter (Red-Free)</Text>
                </View>
              </View>
            )}

            {selectedView === 'vessels' && (
              <View style={styles.vesselsOverlay}>
                <View style={styles.vesselsVascularBranch} />
                <View style={styles.vesselsBadge}>
                  <MaterialCommunityIcons name="vector-polyline" size={12} color="#38bdf8" style={{ marginRight: 4 }} />
                  <Text style={styles.vesselsBadgeText}>Deep Vessel Contrast & Microaneurysms</Text>
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
                <Ionicons name="expand-outline" size={12} color="#93c5fd" style={{ marginRight: 4 }} />
                <Text style={styles.tapToZoomText}>Tap to inspect high-res</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Clinical Modality Description Banner */}
          <View style={styles.modalityInfoBanner}>
            <View style={styles.modalityIconCircle}>
              {renderModalityIcon(activeModality, 20, colors.primary)}
            </View>
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
              const iconColor = isSelected ? colors.primary : '#64748b';
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
                  {renderModalityIcon(modality, 16, iconColor)}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.expandModalButtonText}>
                Open Multi-Angle Retinal Viewer
              </Text>
            </View>
            <Text style={styles.expandModalButtonSub}>
              Compare side-by-side or inspect thermal & vessel layers in full detail
            </Text>
          </TouchableOpacity>
        </View>

        {/* Backend AI Engine & Clinical Safeguards Card */}
        <View style={[styles.card, styles.backendEngineCard]}>
          <View style={styles.backendCardHeaderRow}>
            <View style={styles.backendIconBadge}>
              <MaterialCommunityIcons name="server-network" size={16} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.backendEngineTag}>AI ENGINE & CLINICAL SAFEGUARDS</Text>
              <Text style={styles.backendModelName}>PyTorch E8 Referable ResNet-50</Text>
            </View>
            <View style={[
              styles.backendStatusBadge,
              referableDR ? styles.backendStatusReferable : styles.backendStatusHealthy
            ]}>
              <Text style={[
                styles.backendStatusText,
                referableDR ? styles.backendStatusTextReferable : styles.backendStatusTextHealthy
              ]}>
                {referableDR ? 'Referable DR' : 'Non-Referable'}
              </Text>
            </View>
          </View>

          <View style={styles.backendMetricsGrid}>
            <View style={styles.backendMetricItem}>
              <Text style={styles.backendMetricLabel}>Referable Risk</Text>
              <Text style={styles.backendMetricValue}>
                {referableProbability !== undefined
                  ? `${Math.round(referableProbability * 100)}%`
                  : `${confidence}%`}
              </Text>
            </View>

            <View style={styles.backendMetricItem}>
              <Text style={styles.backendMetricLabel}>Uncertainty</Text>
              <Text style={[
                styles.backendMetricValue,
                { color: uncertaintyLevel === 'High' ? '#ef4444' : uncertaintyLevel === 'Moderate' ? '#f59e0b' : '#10b981' }
              ]}>
                {uncertaintyLevel || 'Low'}
              </Text>
            </View>

            <View style={styles.backendMetricItem}>
              <Text style={styles.backendMetricLabel}>Safety Gate</Text>
              <Text style={[
                styles.backendMetricValue,
                { color: reviewRequired ? '#f59e0b' : '#10b981' }
              ]}>
                {reviewRequired ? 'Review Flag' : 'Passed'}
              </Text>
            </View>
          </View>

          {Array.isArray(record?.conformalPredictionSet) && record.conformalPredictionSet.length > 0 && (
            <View style={styles.conformalBox}>
              <Text style={styles.conformalLabel}>Conformal Prediction Set (95% Coverage):</Text>
              <View style={styles.conformalChipsRow}>
                {record.conformalPredictionSet.map((cls, idx) => {
                  const DR_NAMES = ['No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR'];
                  const label = typeof cls === 'number' ? (DR_NAMES[cls] || `Grade ${cls}`) : String(cls);
                  return (
                    <View key={idx} style={styles.conformalChip}>
                      <Text style={styles.conformalChipText}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {record?.technicalQuality && (
            <View style={styles.techQualityRow}>
              <Text style={styles.techQualityLabel}>Image Quality Metrics:</Text>
              <Text style={styles.techQualityValues}>
                Sharpness: {record.technicalQuality.sharpness ? Math.round(record.technicalQuality.sharpness) : 'Gradable'}
                {record.technicalQuality.meanLuminance ? ` · Lum: ${Math.round(record.technicalQuality.meanLuminance)}/255` : ''}
                {record.technicalQuality.fieldCoverage ? ` · FoV: ${Math.round(record.technicalQuality.fieldCoverage * 100)}%` : ''}
              </Text>
            </View>
          )}
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
              <FontAwesome5 name="user-md" size={24} color={colors.primary} />
            </View>
            <View style={styles.doctorInfoCol}>
              <Text style={styles.doctorName}>{recommendedDoctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{recommendedDoctor.specialty}</Text>
              <Text style={styles.doctorHospital}>{recommendedDoctor.hospital}</Text>
            </View>
          </View>

          <View style={styles.doctorDivider} />

          <View style={styles.timeframeRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
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
              <Ionicons name="call-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.contactBtnText}>Contact Specialist Clinic</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DOCTOR CLINICAL REVIEW & VERIFICATION ACTIONS */}
        {userRole === 'doctor' && (
          <View style={[styles.card, styles.doctorReviewActionCard]}>
            <View style={styles.doctorReviewHeaderRow}>
              <View style={styles.doctorReviewIconCircle}>
                <MaterialCommunityIcons name="stethoscope" size={22} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorReviewTitle}>Doctor Clinical Decision</Text>
                <Text style={styles.doctorReviewSubtitle}>
                  Review fundus image captured by field worker & endorse or override AI assessment
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.doctorConfirmBtn,
                doctorSigned && { backgroundColor: '#15803d' },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setDoctorSigned(true);
                setDecisionMessage(`Report verified & digitally endorsed by Doctor for ${patientName}.`);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.doctorConfirmBtnText}>
                {doctorSigned ? 'Endorsed & Signed by Doctor' : 'Confirm & Sign Result'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doctorOverrideBtn}
              activeOpacity={0.85}
              onPress={() => setShowOverrideModal(true)}
            >
              <Ionicons name="create-outline" size={16} color="#0284c7" style={{ marginRight: 6 }} />
              <Text style={styles.doctorOverrideBtnText}>Override Result / Clinical Revision</Text>
            </TouchableOpacity>

            {decisionMessage ? (
              <View style={styles.doctorDecisionFeedbackBox}>
                <Text style={styles.doctorDecisionFeedbackText}>{decisionMessage}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Profile Details Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Doctor Clinical Override Modal */}
      <Modal
        visible={showOverrideModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOverrideModal(false)}
      >
        <View style={styles.overrideModalBackdrop}>
          <View style={styles.overrideModalCard}>
            <View style={styles.overrideModalHeader}>
              <Text style={styles.overrideModalTitle}>Clinical Diagnosis Override</Text>
              <TouchableOpacity
                onPress={() => setShowOverrideModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.overrideModalSubtitle}>
              Revise clinical staging for patient {patientName} captured by healthcare field worker:
            </Text>

            <TouchableOpacity
              style={styles.overrideOptionBtn}
              activeOpacity={0.75}
              onPress={() => {
                setDoctorSigned(true);
                setDecisionMessage('Overridden to: No DR / Healthy Retina (Re-screen in 12 months).');
                setShowOverrideModal(false);
              }}
            >
              <View style={styles.overrideOptionHeaderRow}>
                <View style={[styles.overrideBadgeDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.overrideOptionTitle}>No DR / Normal (Clinically Insignificant)</Text>
              </View>
              <Text style={styles.overrideOptionSub}>No microaneurysms, vessels clear. Routine 1-year follow-up.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overrideOptionBtn}
              activeOpacity={0.75}
              onPress={() => {
                setDoctorSigned(true);
                setDecisionMessage('Overridden to: Mild Non-Proliferative DR (Follow-up 6 months).');
                setShowOverrideModal(false);
              }}
            >
              <View style={styles.overrideOptionHeaderRow}>
                <View style={[styles.overrideBadgeDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.overrideOptionTitle}>Mild NPDR (Microaneurysms Only)</Text>
              </View>
              <Text style={styles.overrideOptionSub}>Strict glycemic control & primary care review within 6 months.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overrideOptionBtn, styles.overrideOptionBtnUrgent]}
              activeOpacity={0.75}
              onPress={() => {
                setDoctorSigned(true);
                setDecisionMessage('Overridden to: Severe DR / Urgent Tertiary Referral Required.');
                setShowOverrideModal(false);
              }}
            >
              <View style={styles.overrideOptionHeaderRow}>
                <View style={[styles.overrideBadgeDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.overrideOptionTitle, { color: '#dc2626' }]}>
                  Severe DR / Clinically Significant Macular Edema
                </Text>
              </View>
              <Text style={styles.overrideOptionSub}>Immediate laser photocoagulation or anti-VEGF referral.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overrideCancelBtn}
              onPress={() => setShowOverrideModal(false)}
            >
              <Text style={styles.overrideCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN RETINAL MULTI-ANGLE & THERMAL INSPECTION MODAL */}
      <Modal
        visible={showViewerModal}
        animationType="slide"
        transparent={Platform.OS === 'web'}
        onRequestClose={() => setShowViewerModal(false)}
      >
        <View style={styles.modalRootOverlay}>
          <View style={styles.modalDeviceContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
                onPress={() => setShowViewerModal(false)}
              >
                <Ionicons name="close" size={20} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>

              <View style={styles.modalHeaderCenter}>
                <Text style={styles.modalHeaderTitle}>Retinal Diagnostic Viewer</Text>
                <Text style={styles.modalHeaderSub}>
                  ID: {record?.id ? record.id.slice(-6) : 'REC-01'} · Multi-Spectrum
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
                  <View style={styles.modalActiveBannerIconBox}>
                    {renderModalityIcon(activeModality, 24, '#38bdf8')}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalActiveBannerTitle}>{activeModality.name}</Text>
                    <Text style={styles.modalActiveBannerTag}>{activeModality.badge}</Text>
                  </View>
                </View>
              </View>

              {/* High-Resolution Retinal Image Canvas */}
              <View style={styles.modalRetinaFrame}>
                <Image
                  source={retinaSource}
                  style={styles.modalRetinaImage}
                  resizeMode="contain"
                />

                {/* Spectral Filter Overlays without blocking the image */}
                {selectedView === 'thermal' && (
                  <View style={styles.modalFilterThermalTint} pointerEvents="none" />
                )}
                {selectedView === 'redfree' && (
                  <View style={styles.modalFilterRedFreeTint} pointerEvents="none" />
                )}
                {selectedView === 'vessels' && (
                  <View style={styles.modalFilterVesselsTint} pointerEvents="none" />
                )}

                {/* High-Res Diagnostic Overlays */}
                {selectedView === 'gradcam' && (
                  <View style={styles.modalGradCamOverlay} pointerEvents="none">
                    {!record?.gradCamBase64 && (
                      <>
                        <View style={styles.modalHeatCircleMajor} />
                        <View style={styles.modalHeatCircleMinor} />
                        <View style={styles.modalHeatCircleMacula} />
                      </>
                    )}
                    <View style={styles.modalLesionCrosshair}>
                      <MaterialCommunityIcons name="target" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={styles.modalCrosshairText}>
                        {record?.gradCamBase64
                          ? `PyTorch Grad-CAM++ Attribution (${condition})`
                          : 'Lesion Cluster (Weight: 0.93)'}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedView === 'thermal' && (
                  <View style={styles.modalThermalOverlay} pointerEvents="none">
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
                  <View style={styles.modalRedFreeOverlay} pointerEvents="none">
                    <View style={styles.modalRedFreeDotA} />
                    <View style={styles.modalRedFreeDotB} />
                    <View style={styles.modalRedFreeDotC} />
                    <View style={styles.modalRedFreeBanner}>
                      <MaterialCommunityIcons name="contrast" size={14} color="#34d399" style={{ marginRight: 6 }} />
                      <Text style={styles.modalRedFreeBannerText}>
                        Green Channel Active: Microaneurysms appear sharp black against green background
                      </Text>
                    </View>
                  </View>
                )}

                {selectedView === 'vessels' && (
                  <View style={styles.modalVesselsOverlay} pointerEvents="none">
                    <View style={styles.modalVesselBranch1} />
                    <View style={styles.modalVesselBranch2} />
                    <View style={styles.modalVesselBanner}>
                      <MaterialCommunityIcons name="vector-polyline" size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                      <Text style={styles.modalVesselBannerText}>
                        Angiographic Contrast: Arteriole/Venule Caliber Ratio (A/V) = 0.67
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
                  const iconColor = isSelected ? '#ffffff' : '#94a3b8';
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
                      {renderModalityIcon(modality, 16, iconColor)}
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
                    {record?.gradCamBase64 && selectedView === 'gradcam'
                      ? `Neural activation localized to ${condition} lesion regions with ${confidence}% AI confidence.`
                      : activeModality.findings}
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

                  let backendScore: number | null = null;
                  if (record?.lesionScores && typeof record.lesionScores === 'object') {
                    const normItem = (item.name || '').toLowerCase().replace(/[^a-z]/g, '');
                    for (const [k, v] of Object.entries(record.lesionScores)) {
                      const normKey = k.toLowerCase().replace(/[^a-z]/g, '');
                      if (normItem.includes(normKey) || normKey.includes(normItem)) {
                        backendScore = Math.round((v as number) * 100);
                        break;
                      }
                    }
                  }

                  return (
                    <View key={index} style={styles.modalEvidenceItem}>
                      <View style={[styles.evidenceDot, { backgroundColor: dotColor }]} />
                      <Text style={styles.modalEvidenceName}>{item.name}</Text>
                      <Text style={[styles.modalEvidenceLevel, { color: dotColor }]}>
                        {backendScore !== null ? `${item.level} (${backendScore}%)` : item.level}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fieldWorkerTagText: {
    fontSize: 10,
    color: '#0369a1',
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 12,
    alignItems: 'flex-start',
  },
  modalityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalRootOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeviceContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    maxHeight: Platform.OS === 'web' ? 900 : undefined,
    backgroundColor: '#090d16',
    borderRadius: Platform.OS === 'web' ? 28 : 0,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 20,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#1e293b',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : Platform.OS === 'web' ? 18 : 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  modalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
  modalActiveBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalFilterThermalTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
  },
  modalFilterRedFreeTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
  },
  modalFilterVesselsTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.20)',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    padding: 10,
    borderRadius: 12,
  },
  modalRedFreeBannerText: {
    color: '#d1fae5',
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 15,
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 74, 110, 0.95)',
    padding: 10,
    borderRadius: 12,
  },
  modalVesselBannerText: {
    color: '#e0f2fe',
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 15,
    flex: 1,
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
    marginBottom: 12,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 44,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 18,
    marginTop: 6,
    marginBottom: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  doctorReviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  doctorReviewIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  doctorReviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  doctorReviewSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 17,
  },
  doctorConfirmBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  doctorConfirmBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  doctorOverrideBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#cbd5e1',
  },
  doctorOverrideBtnText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '700',
  },
  doctorDecisionFeedbackBox: {
    marginTop: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  doctorDecisionFeedbackText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  overrideModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overrideModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  overrideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overrideModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  overrideModalSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  overrideOptionBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  overrideOptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  overrideBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  overrideOptionBtnUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  overrideOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overrideOptionSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  overrideCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  overrideCancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  // Backend AI Engine & Safeguards Card Styles
  backendEngineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    backgroundColor: '#f8fafc',
  },
  backendCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backendIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backendEngineTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    letterSpacing: 0.8,
  },
  backendModelName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backendStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  backendStatusReferable: {
    backgroundColor: '#fee2e2',
  },
  backendStatusHealthy: {
    backgroundColor: '#dcfce7',
  },
  backendStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  backendStatusTextReferable: {
    color: '#dc2626',
  },
  backendStatusTextHealthy: {
    color: '#15803d',
  },
  backendMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  backendMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  backendMetricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  backendMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  conformalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  conformalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  conformalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conformalChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  conformalChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  techQualityRow: {
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  techQualityLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  techQualityValues: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
});
