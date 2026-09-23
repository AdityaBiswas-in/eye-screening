import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { UserRole } from '../types';

export const RoleSelectScreen: React.FC = () => {
  const { t, userRole, setUserRole, navigate, goBack, canGoBack } = useApp();

  const handleContinue = () => {
    if (userRole === 'patient') {
      navigate('patientProfile');
    } else if (userRole === 'worker') {
      navigate('workerProfile');
    } else if (userRole === 'doctor') {
      navigate('doctorProfile');
    } else {
      navigate('dashboard');
    }
  };

  const roles: {
    id: UserRole;
    title: string;
    desc: string;
    iconType: 'ionicons' | 'material' | 'fa5';
    iconName: string;
  }[] = [
    {
      id: 'patient',
      title: t.patientTitle,
      desc: t.patientDesc,
      iconType: 'ionicons',
      iconName: 'eye-outline',
    },
    {
      id: 'worker',
      title: t.workerTitle,
      desc: t.workerDesc,
      iconType: 'material',
      iconName: 'camera-iris',
    },
    {
      id: 'doctor',
      title: t.doctorTitle,
      desc: t.doctorDesc,
      iconType: 'fa5',
      iconName: 'user-md',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {canGoBack && (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              <Text style={styles.backButtonText}>{t.back}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.brandTag}>{t.appName}</Text>
          <Text style={styles.title}>{t.howWillYouUse}</Text>
        </View>

        {/* Roles List */}
        <View style={styles.rolesList}>
          {roles.map((role) => {
            const isSelected = userRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  isSelected ? styles.cardSelected : styles.cardUnselected,
                ]}
                activeOpacity={0.85}
                onPress={() => setUserRole(role.id)}
              >
                {/* Icon Squircle */}
                <View
                  style={[
                    styles.iconBox,
                    isSelected ? styles.iconBoxSelected : styles.iconBoxUnselected,
                  ]}
                >
                  {role.iconType === 'ionicons' && (
                    <Ionicons
                      name={role.iconName as any}
                      size={24}
                      color={isSelected ? colors.primary : '#64748b'}
                    />
                  )}
                  {role.iconType === 'material' && (
                    <MaterialCommunityIcons
                      name={role.iconName as any}
                      size={24}
                      color={isSelected ? colors.primary : '#64748b'}
                    />
                  )}
                  {role.iconType === 'fa5' && (
                    <FontAwesome5
                      name={role.iconName as any}
                      size={22}
                      color={isSelected ? colors.primary : '#64748b'}
                    />
                  )}
                </View>

                {/* Details */}
                <View style={styles.roleDetails}>
                  <Text
                    style={[
                      styles.roleTitle,
                      isSelected ? styles.titleSelected : styles.titleDark,
                    ]}
                  >
                    {role.title}
                  </Text>
                  <Text
                    style={[
                      styles.roleDesc,
                      isSelected ? styles.descSelected : styles.descMuted,
                    ]}
                  >
                    {role.desc}
                  </Text>
                </View>

                {/* Radio Indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected ? styles.radioSelected : styles.radioUnselected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInnerDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue Button */}
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
    flexGrow: 1,
  },
  header: {
    marginBottom: 28,
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
    lineHeight: 34,
  },
  rolesList: {
    gap: 14,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  cardUnselected: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  iconBoxUnselected: {
    backgroundColor: '#f1f5f9',
  },
  iconEmoji: {
    fontSize: 22,
  },
  roleDetails: {
    flex: 1,
    paddingRight: 10,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleSelected: {
    color: '#ffffff',
  },
  titleDark: {
    color: colors.textPrimary,
  },
  roleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  descSelected: {
    color: '#d4ecee',
  },
  descMuted: {
    color: colors.textMuted,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#ffffff',
  },
  radioUnselected: {
    borderWidth: 1.8,
    borderColor: '#cbd5e1',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  bottomSection: {
    paddingTop: 16,
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
