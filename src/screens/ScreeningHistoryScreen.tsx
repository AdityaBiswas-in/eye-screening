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

  // Dynamic patient header info from user profile/account
  const patientName =
    patientProfile.fullName || account.fullName || 'Patient Profile';

  const initials =
    (patientProfile.fullName || account.fullName)
      ? (patientProfile.fullName || account.fullName)
          .trim()
          .split(' ')
          .map((p) => p[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'PT';

  const patientAge = patientProfile.age ? `Age ${patientProfile.age}` : 'Age: —';
  const patientSex = patientProfile.sex ? `· ${patientProfile.sex}` : '';
  const patientDiabetes =
    patientProfile.hasDiabetes === 'Yes'
      ? '· Diabetes'
      : patientProfile.hasDiabetes === 'Not sure'
      ? '· Diabetes: Not sure'
      : '';

  // Only genuine screenings captured via AI camera or entered by user/screener
  const allRecords: HistoryRecord[] = screenings.map((s, idx) => ({
    id: s.id || `rec-${idx}`,
    date: s.date || 'Today',
    condition: s.condition || 'No DR',
    status: s.status,
    confidence: s.status === 'REFERABLE' ? 92 : 95,
    quality: 'Good',
    color: s.status === 'REFERABLE' ? 'red' : 'green',
  }));

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
              {patientAge} {patientSex} {patientDiabetes}
            </Text>
          </View>
        </View>

        {allRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>No screening records yet</Text>
            <Text style={styles.emptySubtitle}>
              You have not recorded any eye screenings yet. Capture a retinal image using the camera to view AI diagnostic findings and track disease progression over time.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              activeOpacity={0.85}
              onPress={() => navigate('eyeCamera')}
            >
              <Text style={styles.emptyActionBtnText}>📸 Start Retinal Scan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* DR Progression Section */}
            <View style={styles.progressionSection}>
              <Text style={styles.sectionLabel}>DR PROGRESSION</Text>
              <View style={styles.barsContainer}>
                {allRecords.slice(0, 4).reverse().map((rec) => (
                  <View key={rec.id} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        rec.color === 'red'
                          ? styles.barRed
                          : rec.color === 'amber'
                          ? styles.barAmber
                          : styles.barGreen,
                      ]}
                    />
                    <Text style={styles.barDate}>{rec.date}</Text>
                  </View>
                ))}
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
        </>
      )}
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
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
