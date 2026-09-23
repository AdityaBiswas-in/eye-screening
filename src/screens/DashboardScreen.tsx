import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { RetinaLogo } from '../components/RetinaLogo';
import { LanguageModal } from '../components/LanguageModal';
import { LANGUAGES } from '../i18n/translations';

export const DashboardScreen: React.FC = () => {
  const {
    t,
    account,
    patientProfile,
    userRole,
    language,
    navigate,
    signOut,
  } = useApp();

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSignOut = () => {
    signOut();
  };

  const roleTitles = {
    patient: t.patientTitle,
    worker: t.workerTitle,
    doctor: t.doctorTitle,
  };

  const displayName =
    patientProfile.fullName || account.fullName || 'Valued User';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.langPillButton}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <Text style={styles.langPillText}>🌐 {currentLang.nativeName}</Text>
            </TouchableOpacity>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleTitles[userRole]}</Text>
            </View>

            <TouchableOpacity
              style={styles.signOutIconButton}
              activeOpacity={0.7}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutIconText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RetinaLogo size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Retinal Health Check</Text>
              <Text style={styles.cardSub}>AI Diabetic Retinopathy Screening</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Patient Details Snapshot */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>{t.age}</Text>
              <Text style={styles.infoValue}>{patientProfile.age ? `${patientProfile.age} yrs` : '—'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>{t.sex}</Text>
              <Text style={styles.infoValue}>{patientProfile.sex || '—'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Diabetes</Text>
              <Text style={styles.infoValue}>
                {patientProfile.hasDiabetes || '—'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.85}
            onPress={() => navigate('eyeCamera')}
          >
            <Text style={styles.actionButtonText}>📸 Start Retinal Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Features List */}
        <Text style={styles.sectionHeader}>Screening Tools</Text>

        <View style={styles.toolsList}>
          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => navigate('screeningHistory')}
          >
            <Text style={styles.toolEmoji}>📋</Text>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>Screening History</Text>
              <Text style={styles.toolSub}>Track past scans and DR progression</Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => navigate('reportScreen')}
          >
            <Text style={styles.toolEmoji}>📄</Text>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>Latest Screening Report</Text>
              <Text style={styles.toolSub}>AI diagnostic findings, evidence & doctors</Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={styles.toolEmoji}>🌐</Text>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>Change Language</Text>
              <Text style={styles.toolSub}>
                Currently set to {currentLang.nativeName} ({language.toUpperCase()})
              </Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.75}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out of RetinaCare</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPillButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  signOutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutIconText: {
    fontSize: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  signOutButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  signOutButtonText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoCol: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  toolsList: {
    gap: 10,
    marginBottom: 24,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  toolEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toolSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  toolChevron: {
    fontSize: 20,
    color: colors.textLight,
  },
  restartButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  restartButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
