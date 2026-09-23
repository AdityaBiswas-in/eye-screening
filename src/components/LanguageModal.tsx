import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { LANGUAGES } from '../i18n/translations';
import { SupportedLanguage } from '../types';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  onClose,
}) => {
  const { t, language, setLanguage } = useApp();

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.tag}>RETINACARE</Text>
            <Text style={styles.title}>{t.chooseLanguage}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Languages Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          <View style={styles.grid}>
            {LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langCard,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectLanguage(lang.code)}
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
                      isSelected ? styles.subSelected : styles.subMuted,
                    ]}
                  >
                    {lang.englishName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
    elevation: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '75%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  scrollList: {
    paddingBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  langCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  cardSelected: {
    backgroundColor: colors.primary,
  },
  cardUnselected: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  englishName: {
    fontSize: 12,
  },
  textSelected: {
    color: '#ffffff',
  },
  textDark: {
    color: colors.textPrimary,
  },
  subSelected: {
    color: '#d4ecee',
  },
  subMuted: {
    color: colors.textMuted,
  },
});
