import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { LanguageModal } from '../components/LanguageModal';
import { ProfileModal } from '../components/ProfileModal';
import { LANGUAGES } from '../i18n/translations';
import { RetinaAppBrand } from '../components/RetinaLogo';

interface PriorityCase {
  id: string;
  initials: string;
  name: string;
  age: number | string;
  time: string;
  condition: string;
  status: string;
}

export const DoctorDashboardScreen: React.FC = () => {
  const { doctorProfile, account, screenings, navigate, signOut, language, viewReport } = useApp();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const doctorName =
    doctorProfile.fullName || account.fullName || 'Doctor';

  const awaitingCount = screenings.length;

  const handleSignOut = () => {
    signOut();
  };

  const highPriorityCases: PriorityCase[] = screenings
    .filter((s) => s.status === 'REFERABLE')
    .map((s) => ({
      id: s.id,
      initials: s.initials,
      name: s.name,
      age: s.age,
      time: s.date || 'Today',
      condition: s.condition,
      status: s.status,
    }));

  const reviewedToday = 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 6 }}>
              <RetinaAppBrand size={26} />
            </View>
            <Text style={styles.greetingText}>Good afternoon, Dr.</Text>
            <Text style={styles.doctorNameText}>{doctorName}</Text>
          </View>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.langPillButton}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <Ionicons name="globe-outline" size={14} color="#0284c7" />
              <Text style={styles.langPillText}>{currentLang.nativeName}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.7}
              onPress={() => setShowProfileModal(true)}
            >
              <Ionicons name="person-circle-outline" size={24} color="#0284c7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Pastel Metrics Cards */}
        <View style={styles.metricsRow}>
          {/* Awaiting Review (Red Tint) */}
          <View style={[styles.metricCard, styles.cardRed]}>
            <Text style={[styles.metricNumber, styles.textRed]}>
              {awaitingCount}
            </Text>
            <Text style={[styles.metricLabel, styles.labelRed]}>
              Awaiting review
            </Text>
          </View>

          {/* High Priority (Yellow/Amber Tint) */}
          <View style={[styles.metricCard, styles.cardAmber]}>
            <Text style={[styles.metricNumber, styles.textAmber]}>
              {highPriorityCases.length}
            </Text>
            <Text style={[styles.metricLabel, styles.labelAmber]}>
              High priority
            </Text>
          </View>

          {/* Reviewed Today (Green Tint) */}
          <View style={[styles.metricCard, styles.cardGreen]}>
            <Text style={[styles.metricNumber, styles.textGreen]}>
              {reviewedToday}
            </Text>
            <Text style={[styles.metricLabel, styles.labelGreen]}>
              Reviewed today
            </Text>
          </View>
        </View>

        {/* High Priority Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>High priority</Text>
          <View style={styles.priorityBadge}>
            <View style={styles.redDot} />
            <Text style={styles.priorityBadgeText}>
              {highPriorityCases.length} cases
            </Text>
          </View>
        </View>

        {/* Priority Case Cards or Empty State */}
        {highPriorityCases.length === 0 ? (
          <View style={styles.emptyPriorityCard}>
            <Text style={styles.emptyPriorityTitle}>No high priority cases</Text>
            <Text style={styles.emptyPrioritySub}>
              Patients requiring immediate review will be flagged here.
            </Text>
          </View>
        ) : (
          <View style={styles.casesList}>
          {highPriorityCases.map((item) => {
            const rawScreening = screenings.find((s) => s.id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.caseCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (rawScreening) {
                    viewReport(rawScreening);
                  } else {
                    navigate('doctorQueue');
                  }
                }}
              >
              {/* Initials */}
              <View
                style={[
                  styles.initialsBox,
                  item.status === 'REFERABLE'
                    ? styles.initialsRed
                    : styles.initialsAmber,
                ]}
              >
                <Text
                  style={[
                    styles.initialsText,
                    item.status === 'REFERABLE'
                      ? styles.textRed
                      : styles.textAmber,
                  ]}
                >
                  {item.initials}
                </Text>
              </View>

              {/* Patient Details */}
              <View style={styles.caseInfo}>
                <Text style={styles.patientName}>{item.name}</Text>
                <Text style={styles.patientMeta}>
                  Age {item.age} · {item.time || 'Today'}
                </Text>
              </View>

              {/* Condition & Status */}
              <View style={styles.statusCol}>
                <Text style={styles.conditionText}>{item.condition}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'REFERABLE'
                      ? styles.badgeRed
                      : styles.badgeAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === 'REFERABLE'
                        ? styles.badgeTextRed
                        : styles.badgeTextAmber,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Full Review Queue Card */}
        <TouchableOpacity
          style={styles.queueBanner}
          activeOpacity={0.8}
          onPress={() => navigate('doctorQueue')}
        >
          <View style={styles.queueIconBox}>
            <MaterialCommunityIcons name="clipboard-pulse-outline" size={24} color="#0284c7" />
          </View>

          <View style={styles.queueBannerText}>
            <Text style={styles.queueBannerTitle}>Full review queue</Text>
            <Text style={styles.queueBannerSub}>
              {awaitingCount} cases awaiting review
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Prominent Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBannerButton}
          activeOpacity={0.75}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={19} color="#dc2626" />
          <Text style={styles.signOutBannerButtonText}>Sign Out of RetinaCare</Text>
        </TouchableOpacity>
      </ScrollView>



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
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 13.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  doctorNameText: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPillButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  profileIcon: {
    fontSize: 20,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutIcon: {
    fontSize: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRed: {
    backgroundColor: '#fef2f2',
  },
  cardAmber: {
    backgroundColor: '#fffbeb',
  },
  cardGreen: {
    backgroundColor: '#f0fdf4',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  textRed: {
    color: '#ef4444',
  },
  textAmber: {
    color: '#d97706',
  },
  textGreen: {
    color: '#10b981',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelRed: {
    color: '#991b1b',
  },
  labelAmber: {
    color: '#92400e',
  },
  labelGreen: {
    color: '#166534',
  },
  sectionHeaderRow: {
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },
  priorityBadgeText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  casesList: {
    gap: 12,
    marginBottom: 16,
  },
  caseCard: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsRed: {
    backgroundColor: '#fef2f2',
  },
  initialsAmber: {
    backgroundColor: '#fffbeb',
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
  },
  caseInfo: {
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
  badgeRed: {
    backgroundColor: '#fee2e2',
  },
  badgeAmber: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeTextRed: {
    color: '#ef4444',
  },
  badgeTextAmber: {
    color: '#b45309',
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    marginTop: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  queueIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e6f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  queueIcon: {
    fontSize: 20,
  },
  queueBannerText: {
    flex: 1,
  },
  queueBannerTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  queueBannerSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chevronIcon: {
    fontSize: 22,
    color: colors.textLight,
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
    paddingHorizontal: 20,
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
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  navActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyPriorityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8edf3',
    marginBottom: 16,
  },
  emptyPriorityTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyPrioritySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signOutBannerButton: {
    marginTop: 24,
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
