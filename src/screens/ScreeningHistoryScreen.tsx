import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

interface HistoryRecord {
  id: string;
  date: string;
  condition: string;
  status: 'REFERABLE' | 'NON-REFERABLE';
  confidence: number;
  quality: string;
  color: 'red' | 'amber' | 'green';
}

export const ScreeningHistoryScreen: React.FC = () => {
  const { goBack, canGoBack, navigate, patientProfile, account, screenings } = useApp();

  // Dynamic patient header info
  const patientName =
    patientProfile.fullName || account.fullName || 'Priya Sharma';

  const initials = patientName
    .trim()
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'PS';

  const patientAge = patientProfile.age || '58';
  const patientSex = patientProfile.sex || 'Female';
  const patientDiabetes =
    patientProfile.hasDiabetes === 'Yes'
      ? 'Diabetes 12 years'
      : patientProfile.hasDiabetes === 'No'
      ? 'Non-diabetic'
      : 'Diabetes 12 years';

  // Base clinical history records matching design
  const defaultRecords: HistoryRecord[] = [
    {
      id: 'rec-1',
      date: '15 Sep 2026',
      condition: 'Moderate DR',
      status: 'REFERABLE',
      confidence: 93,
      quality: 'Good',
      color: 'red',
    },
    {
      id: 'rec-2',
      date: '20 Mar 2026',
      condition: 'Mild DR',
      status: 'NON-REFERABLE',
      confidence: 88,
      quality: 'Good',
      color: 'amber',
    },
    {
      id: 'rec-3',
      date: '10 Sep 2025',
      condition: 'No DR',
      status: 'NON-REFERABLE',
      confidence: 97,
      quality: 'Excellent',
      color: 'green',
    },
  ];

  // Map any live screenings captured via AI camera into the timeline
  const liveRecords: HistoryRecord[] = screenings.map((s, idx) => ({
    id: s.id || `live-${idx}`,
    date: s.date || 'Today',
    condition: s.condition || 'No DR',
    status: s.status,
    confidence: s.status === 'REFERABLE' ? 92 : 95,
    quality: 'Good',
    color: s.status === 'REFERABLE' ? 'red' : 'green',
  }));

  const allRecords = [...liveRecords, ...defaultRecords];

  const handleBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate('dashboard');
    }
  };

  const handleShowDetails = (rec: HistoryRecord) => {
    Alert.alert(
      `${rec.condition} (${rec.status})`,
      `Date: ${rec.date}\nAI Confidence: ${rec.confidence}%\nImage Quality: ${rec.quality}\n\nClinical Guidance:\n${
        rec.status === 'REFERABLE'
          ? 'Referral required to retina specialist within 30 days for comprehensive dilated fundus examination.'
          : 'Annual routine retinal screening advised. Maintain healthy glycemic and blood pressure control.'
      }`,
      [{ text: 'Close' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBack}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Screening history</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Profile Snapshot Card */}
        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientMeta}>
              Age {patientAge} · {patientSex} · {patientDiabetes}
            </Text>
          </View>
        </View>

        {/* DR Progression Section */}
        <View style={styles.progressionSection}>
          <Text style={styles.sectionLabel}>DR PROGRESSION</Text>

          {/* 3 Progress Bars matching screenshot */}
          <View style={styles.barsContainer}>
            {/* Green Bar (Sep 2025) */}
            <View style={styles.barCol}>
              <View style={[styles.bar, styles.barGreen]} />
              <Text style={styles.barDate}>Sep 2025</Text>
            </View>

            {/* Amber Bar (Mar 2026) */}
            <View style={styles.barCol}>
              <View style={[styles.bar, styles.barAmber]} />
              <Text style={styles.barDate}>Mar 2026</Text>
            </View>

            {/* Red Bar (Sep 2026) */}
            <View style={styles.barCol}>
              <View style={[styles.bar, styles.barRed]} />
              <Text style={styles.barDate}>Sep 2026</Text>
            </View>
          </View>
        </View>

        {/* Timeline Records */}
        <View style={styles.timelineWrapper}>
          {/* Continuous vertical connector line */}
          <View style={styles.timelineLine} />

          {/* Timeline Items */}
          <View style={styles.recordsList}>
            {allRecords.map((rec) => {
              const isRed = rec.color === 'red';
              const isAmber = rec.color === 'amber';

              return (
                <View key={rec.id} style={styles.timelineRow}>
                  {/* Left Timeline Node */}
                  <View
                    style={[
                      styles.timelineNodeOuter,
                      isRed && styles.nodeOuterRed,
                      isAmber && styles.nodeOuterAmber,
                      !isRed && !isAmber && styles.nodeOuterGreen,
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineNodeInner,
                        isRed && styles.nodeInnerRed,
                        isAmber && styles.nodeInnerAmber,
                        !isRed && !isAmber && styles.nodeInnerGreen,
                      ]}
                    />
                  </View>

                  {/* Right Record Card */}
                  <TouchableOpacity
                    style={styles.recordCard}
                    activeOpacity={0.75}
                    onPress={() => handleShowDetails(rec)}
                  >
                    <Text style={styles.recordDate}>{rec.date}</Text>

                    <View style={styles.recordMainRow}>
                      <Text style={styles.recordCondition}>{rec.condition}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          rec.status === 'REFERABLE'
                            ? styles.badgeReferable
                            : styles.badgeNonReferable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            rec.status === 'REFERABLE'
                              ? styles.badgeTextReferable
                              : styles.badgeTextNonReferable,
                          ]}
                        >
                          {rec.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recordMeta}>
                      Confidence {rec.confidence}% · Quality: {rec.quality}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 14,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 26,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#e6f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressionSection: {
    marginBottom: 26,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#94a3b8',
    marginBottom: 14,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 8,
  },
  barGreen: {
    height: 18,
    backgroundColor: '#52a67e',
  },
  barAmber: {
    height: 32,
    backgroundColor: '#be7b48',
  },
  barRed: {
    height: 44,
    backgroundColor: '#c96464',
  },
  barDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timelineWrapper: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 17,
    top: 20,
    bottom: 40,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  recordsList: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineNodeOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  nodeOuterRed: {
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  nodeOuterAmber: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  nodeOuterGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },
  timelineNodeInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nodeInnerRed: {
    backgroundColor: '#ef4444',
  },
  nodeInnerAmber: {
    backgroundColor: '#f59e0b',
  },
  nodeInnerGreen: {
    backgroundColor: '#10b981',
  },
  recordCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recordDate: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 4,
  },
  recordMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordCondition: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeReferable: {
    backgroundColor: '#fee2e2',
  },
  badgeNonReferable: {
    backgroundColor: '#ecfdf5',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextReferable: {
    color: '#dc2626',
  },
  badgeTextNonReferable: {
    color: '#059669',
  },
  recordMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
