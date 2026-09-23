import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { LANGUAGES } from '../i18n/translations';
import { SupportedLanguage } from '../types';

export const LanguageSelectScreen: React.FC = () => {
  const {
    t,
    language,
    setLanguage,
    navigate,
    goBack,
    canGoBack,
    account,
  } = useApp();

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
  };

  const handleContinue = () => {
    if (canGoBack && account.fullName) {
      goBack();
    } else {
      navigate('role');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          {canGoBack && (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← {t.back}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.brandTag}>{t.appName}</Text>
          <Text style={styles.title}>{t.chooseLanguage}</Text>
        </View>

        {/* 2-Column Language Grid */}
        <View style={styles.grid}>
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  isSelected ? styles.cardSelected : styles.cardUnselected,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelect(lang.code)}
              >
                <Text
                  style={[
                    styles.nativeName,
                    isSelected ? styles.textSelected : styles.textDark,
                  ]}
                >
                  {lang.nativeName}
                </Text>
                <Text
                  style={[
                    styles.englishName,
                    isSelected ? styles.subtextSelected : styles.subtextMuted,
                  ]}
                >
                  {lang.englishName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Continue Action */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>{t.continue}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 24,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    marginBottom: 26,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  languageCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardUnselected: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  englishName: {
    fontSize: 13,
  },
  textSelected: {
    color: '#ffffff',
  },
  textDark: {
    color: colors.textPrimary,
  },
  subtextSelected: {
    color: '#d4ecee',
  },
  subtextMuted: {
    color: colors.textMuted,
  },
  bottomSection: {
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
