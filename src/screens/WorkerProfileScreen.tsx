import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const WorkerProfileScreen: React.FC = () => {
  const {
    t,
    account,
    workerProfile,
    updateWorkerProfile,
    updateAccount,
    navigate,
    goBack,
    canGoBack,
  } = useApp();

  const [fullName, setFullName] = useState(
    workerProfile.fullName || account.fullName || ''
  );
  const [phoneNumber, setPhoneNumber] = useState(
    workerProfile.phoneNumber || account.phoneNumber || ''
  );
  const [healthcareCentre, setHealthcareCentre] = useState(
    workerProfile.healthcareCentre || ''
  );
  const [organisation, setOrganisation] = useState(
    workerProfile.organisation || ''
  );

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isCentreFocused, setIsCentreFocused] = useState(false);
  const [isOrgFocused, setIsOrgFocused] = useState(false);

  const handleContinue = () => {
    updateWorkerProfile({
      fullName,
      phoneNumber,
      healthcareCentre,
      organisation,
    });
    updateAccount({
      fullName,
      phoneNumber,
    });
    navigate('workerDashboard');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            {canGoBack && (
              <TouchableOpacity onPress={goBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                <Text style={styles.backButtonText}>{t.back}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.tag}>HEALTHCARE FIELD WORKER</Text>
            <Text style={styles.title}>Set up your profile</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={[styles.input, isNameFocused && styles.inputFocused]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Kavitha Reddy"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                autoCapitalize="words"
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    isPhoneFocused && styles.inputFocused,
                  ]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Mobile number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                />
              </View>
            </View>

            {/* Healthcare Centre */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>HEALTHCARE CENTRE</Text>
              <TextInput
                style={[styles.input, isCentreFocused && styles.inputFocused]}
                value={healthcareCentre}
                onChangeText={setHealthcareCentre}
                placeholder="e.g. PHC Warangal Rural"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsCentreFocused(true)}
                onBlur={() => setIsCentreFocused(false)}
              />
            </View>

            {/* Organisation */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ORGANISATION</Text>
              <TextInput
                style={[styles.input, isOrgFocused && styles.inputFocused]}
                value={organisation}
                onChangeText={setOrganisation}
                placeholder="e.g. Telangana Health Mission"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsOrgFocused(true)}
                onBlur={() => setIsOrgFocused(false)}
              />
            </View>

            {/* Verification Pending Notice */}
            <View style={styles.noticeCard}>
              <View style={styles.warningIconCircle}>
                <Text style={styles.warningIconText}>!</Text>
              </View>

              <View style={styles.noticeTextContainer}>
                <Text style={styles.noticeTitle}>Verification pending</Text>
                <Text style={styles.noticeSubtitle}>
                  Screener ID will be verified shortly.
                </Text>
              </View>

              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>Demo</Text>
              </View>
            </View>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
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
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
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
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#ffffff',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 15.5,
    color: colors.textPrimary,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryCodeBox: {
    height: 54,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: 54,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 15.5,
    color: colors.textPrimary,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  warningIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningIconText: {
    color: '#d97706',
    fontWeight: '800',
    fontSize: 18,
  },
  noticeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 2,
  },
  noticeSubtitle: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
  },
  demoBadge: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
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
