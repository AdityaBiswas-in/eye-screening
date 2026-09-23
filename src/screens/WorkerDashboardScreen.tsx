import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { ScreeningRecord } from '../types';
import { LanguageModal } from '../components/LanguageModal';
import { ProfileModal } from '../components/ProfileModal';
import { LANGUAGES } from '../i18n/translations';

export const WorkerDashboardScreen: React.FC = () => {
  const { navigate, screenings, addScreening, signOut, language, viewReport } = useApp();
  const [showScanModal, setShowScanModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // New screening form states
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('No DR');
  const [selectedStatus, setSelectedStatus] = useState<'REFERABLE' | 'NON-REFERABLE'>('NON-REFERABLE');

  const referralCount = screenings.filter((s) => s.status === 'REFERABLE').length;
  const todayCount = screenings.length;
  const weekCount = screenings.length;

  const handleSignOut = () => {
    signOut();
  };

  const handleCreateScreening = () => {
    if (!newPatientName.trim()) {
      Alert.alert('Missing Field', 'Please enter the patient name.');
      return;
    }

    const initials = newPatientName
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const record: ScreeningRecord = {
      id: Date.now().toString(),
      initials: initials || 'PT',
      name: newPatientName.trim(),
      date: 'Today',
      age: newPatientAge.trim() || '—',
      condition: selectedCondition,
      status: selectedStatus,
    };

    addScreening(record);
    setNewPatientName('');
    setNewPatientAge('');
    setShowScanModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.tag}>GOOD MORNING</Text>
            <Text style={styles.title}>Ready for the next{'\n'}screening?</Text>
          </View>

          {/* Right Header Buttons */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.langPillButton}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <Text style={styles.langPillText}>🌐 {currentLang.nativeName}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileIconButton}
              activeOpacity={0.7}
              onPress={() => setShowProfileModal(true)}
            >
              <Text style={styles.profileIconText}>👤</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bellButton}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  'Notifications',
                  referralCount > 0
                    ? `${referralCount} referral follow-up(s) required.`
                    : 'No pending notifications.'
                )
              }
            >
              <Text style={styles.bellIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Action Card */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigate('eyeCamera')}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroTag}>PRIMARY ACTION</Text>
            <Text style={styles.heroTitle}>Start New{'\n'}Screening</Text>
            <Text style={styles.heroSub}>
              Capture a fundus image in a few simple steps.
            </Text>
            <View style={styles.beginLink}>
              <Text style={styles.beginText}>Begin ›</Text>
            </View>
          </View>

          {/* Reticle Target Eye Graphic */}
          <View style={styles.heroGraphicContainer}>
            <View style={styles.graphicCircle}>
              <View style={styles.dashedGuideline} />
              <View style={styles.centerReticle} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Metrics Row (3 Cards) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayCount}</Text>
            <Text style={styles.statLabel}>screenings</Text>
            <Text style={styles.statSub}>Today</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{weekCount}</Text>
            <Text style={styles.statLabel}>screenings</Text>
            <Text style={styles.statSub}>This week</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{referralCount}</Text>
            <Text style={styles.statLabel}>pending</Text>
            <Text style={styles.statSub}>Referrals</Text>
          </View>
        </View>

        {/* Recent Screenings Section */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionTitle}>Recent screenings</Text>
          {screenings.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigate('screeningHistory')}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Screening Cards or Empty State */}
        {screenings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No screenings recorded yet</Text>
            <Text style={styles.emptySubtitle}>
              Captured fundus screenings will appear here once submitted.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.8}
              onPress={() => navigate('eyeCamera')}
            >
              <Text style={styles.emptyButtonText}>+ Record First Screening</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.screeningsList}>
            {screenings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.patientCard}
                activeOpacity={0.8}
                onPress={() => viewReport(item)}
              >
                {/* Initials Avatar */}
                <View style={styles.initialsBox}>
                  <Text style={styles.initialsText}>{item.initials}</Text>
                </View>

                {/* Patient Info */}
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientMeta}>
                    {item.date} · Age {item.age}
                  </Text>
                </View>

                {/* Status / Condition */}
                <View style={styles.statusCol}>
                  <Text style={styles.conditionText}>{item.condition}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'REFERABLE'
                        ? styles.badgeReferable
                        : styles.badgeNonReferable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        item.status === 'REFERABLE'
                          ? styles.textReferable
                          : styles.textNonReferable,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Prominent Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBannerButton}
          activeOpacity={0.75}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutBannerButtonText}>🚪 Sign Out of RetinaCare</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Record New Screening Modal */}
      {showScanModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowScanModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Eye Screening</Text>
              <TouchableOpacity onPress={() => setShowScanModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalFieldLabel}>PATIENT FULL NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter patient full name"
                placeholderTextColor={colors.textLight}
                value={newPatientName}
                onChangeText={setNewPatientName}
                autoCapitalize="words"
              />

              <Text style={styles.modalFieldLabel}>PATIENT AGE</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 48"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={3}
                value={newPatientAge}
                onChangeText={setNewPatientAge}
              />

              <Text style={styles.modalFieldLabel}>DIABETIC RETINOPATHY FINDINGS</Text>
              <View style={styles.optionRow}>
                {['No DR', 'Mild DR', 'Moderate DR', 'Severe DR'].map((cond) => {
                  const isSelected = selectedCondition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.condPill,
                        isSelected && styles.condPillSelected,
                      ]}
                      onPress={() => {
                        setSelectedCondition(cond);
                        if (cond === 'No DR' || cond === 'Mild DR') {
                          setSelectedStatus('NON-REFERABLE');
                        } else {
                          setSelectedStatus('REFERABLE');
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.condPillText,
                          isSelected && styles.condPillTextSelected,
                        ]}
                      >
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalFieldLabel}>REFERRAL STATUS</Text>
              <View style={styles.statusRow}>
                {(['NON-REFERABLE', 'REFERABLE'] as const).map((st) => {
                  const isSelected = selectedStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusToggle,
                        isSelected &&
                          (st === 'REFERABLE'
                            ? styles.statusToggleRefSelected
                            : styles.statusToggleNonRefSelected),
                      ]}
                      onPress={() => setSelectedStatus(st)}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          isSelected && styles.statusToggleTextSelected,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitModalBtn}
                activeOpacity={0.85}
                onPress={handleCreateScreening}
              >
                <Text style={styles.submitModalBtnText}>Save Screening Record</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    )}

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

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
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPillButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconText: {
    fontSize: 18,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  signOutIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutIcon: {
    fontSize: 18,
  },
  tag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#94a3b8',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 31,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e6f3f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 18,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroTag: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 27,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: '#d4ecee',
    lineHeight: 18,
    marginBottom: 12,
  },
  beginLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  beginText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroGraphicContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dashedGuideline: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  centerReticle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 10.5,
    color: colors.textLight,
    marginTop: 1,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8edf3',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 240,
  },
  emptyButton: {
    backgroundColor: colors.primaryMuted,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13.5,
  },
  screeningsList: {
    gap: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  initialsBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e6f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  conditionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeReferable: {
    backgroundColor: '#fee2e2',
  },
  badgeNonReferable: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textReferable: {
    color: '#ef4444',
  },
  textNonReferable: {
    color: '#10b981',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 74,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 19,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10.5,
    color: colors.textLight,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  centerScanItem: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  scanPillButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 3,
  },
  scanPillIcon: {
    fontSize: 22,
  },
  scanLabel: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    elevation: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.textMuted,
    padding: 4,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  condPill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  condPillSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  condPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  condPillTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statusToggle: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleNonRefSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  statusToggleRefSelected: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusToggleTextSelected: {
    color: colors.textPrimary,
  },
  submitModalBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitModalBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15.5,
  },
  signOutBannerButton: {
    marginTop: 26,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#fca5a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutBannerButtonText: {
    color: '#ef4444',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
