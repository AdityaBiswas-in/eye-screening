import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { RetinaLogo, RetinaAppBrand } from '../components/RetinaLogo';
import { LanguageModal } from '../components/LanguageModal';
import { ProfileModal } from '../components/ProfileModal';
import { LANGUAGES } from '../i18n/translations';

export const DashboardScreen: React.FC = () => {
  const {
    account,
    patientProfile,
    t,
    language,
    navigate,
    signOut,
  } = useApp();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSignOut = () => {
    signOut();
  };

  const copyPatientId = async () => {
    if (!patientProfile.patientId) return;
    await Clipboard.setStringAsync(patientProfile.patientId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1800);
  };

  const displayName =
    patientProfile.fullName || account.fullName || 'Valued User';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Brand Header */}
        <View style={styles.brandRow}>
          <RetinaAppBrand size={32} />
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.langPillButton}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <Ionicons name="globe-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.langPillText}>{currentLang.nativeName}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileIconButton}
              activeOpacity={0.7}
              onPress={() => setShowProfileModal(true)}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Bar Greeting */}
        <View style={styles.greetingBar}>
          <Text style={styles.greeting}>{t.welcomeBack}</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RetinaLogo size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>{t.retinalHealthCheck}</Text>
              <Text style={styles.cardSub}>{t.diabeticRetinopathyScreening}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Patient ID Card */}
          <TouchableOpacity
            style={styles.patientIdBanner}
            activeOpacity={0.75}
            onPress={copyPatientId}
            disabled={!patientProfile.patientId}
            accessibilityRole="button"
            accessibilityLabel="Copy patient ID"
          >
            <View style={styles.patientIdBannerLeft}>
              <Ionicons name="finger-print" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientIdBannerLabel}>{t.patientId}</Text>
              <Text style={styles.patientIdBannerValue}>
                {patientProfile.patientId || '—'}
              </Text>
              {!!patientProfile.patientId && (
                <Text style={styles.patientIdCopyHint}>
                  {idCopied ? t.copiedToClipboard : t.tapToCopy}
                </Text>
              )}
            </View>
            <Ionicons name={idCopied ? 'checkmark-circle' : 'copy-outline'} size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Features List */}
        <Text style={styles.sectionHeader}>{t.screeningTools}</Text>

        <View style={styles.toolsList}>
          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => navigate('screeningHistory')}
          >
            <View style={styles.toolIconCircle}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>{t.screeningHistory}</Text>
              <Text style={styles.toolSub}>{t.screeningHistoryDescription}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => navigate('reportScreen')}
          >
            <View style={[styles.toolIconCircle, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text-outline" size={22} color="#2563eb" />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>{t.latestScreeningReport}</Text>
              <Text style={styles.toolSub}>{t.latestScreeningReportDescription}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolItem}
            activeOpacity={0.7}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={[styles.toolIconCircle, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="language-outline" size={22} color="#16a34a" />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolTitle}>{t.changeLanguage}</Text>
              <Text style={styles.toolSub}>
                Currently set to {currentLang.nativeName} ({language.toUpperCase()})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.75}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.signOutButtonText}>{t.signOut}</Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  greetingBar: {
    marginBottom: 20,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
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
  toolIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
  patientIdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryMuted,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  patientIdBannerLeft: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7e3e5',
  },
  patientIdBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 3,
  },
  patientIdBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  patientIdCopyHint: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
});
