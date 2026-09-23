import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { RetinaLogo } from '../components/RetinaLogo';
import { LANGUAGES } from '../i18n/translations';
import { LanguageModal } from '../components/LanguageModal';

export const WelcomeScreen: React.FC = () => {
  const { t, language, navigate } = useApp();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <View style={styles.container}>
      {/* Top Header with Language Dropdown Pill */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.langPill}
          activeOpacity={0.7}
          onPress={() => setShowLanguageModal(true)}
        >
          <Ionicons name="globe-outline" size={16} color="#0284c7" />
          <Text style={styles.langPillText}>{currentLangObj.englishName}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Graphic */}
        <View style={styles.logoSection}>
          <RetinaLogo size={104} />
        </View>

        {/* Brand & Titles */}
        <View style={styles.textSection}>
          <Text style={styles.brandTag}>{t.appName}</Text>
          <Text style={styles.title}>{t.tagline}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* 3 Pillars / Value Props */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
              <MaterialCommunityIcons name="hospital-box-outline" size={20} color="#0284c7" />
            </View>
            <Text style={styles.featureLabel}>{t.whoAligned}</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#16a34a" />
            </View>
            <Text style={styles.featureLabel}>{t.securePrivate}</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#fdf2f8' }]}>
              <Ionicons name="language-outline" size={20} color="#db2777" />
            </View>
            <Text style={styles.featureLabel}>{t.languagesCount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Fixed at Bottom */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigate('language')}
        >
          <Text style={styles.primaryButtonText}>{t.getStarted}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signInButton}
          activeOpacity={0.75}
          onPress={() => navigate('signIn')}
        >
          <Text style={styles.signInButtonText}>{t.signIn}</Text>
        </TouchableOpacity>
      </View>

      {/* In-App Language Selection Modal */}
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
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 24 : 36,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    gap: 8,
  },
  langPillText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  langPillChevron: {
    fontSize: 13,
    color: colors.textMuted,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  logoSection: {
    marginTop: 4,
    marginBottom: 18,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 33,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 290,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSection: {
    gap: 10,
    paddingTop: 8,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  signInButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
