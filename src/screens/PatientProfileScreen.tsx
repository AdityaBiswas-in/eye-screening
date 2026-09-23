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
import { DiabetesOption, SexOption } from '../types';

export const PatientProfileScreen: React.FC = () => {
  const {
    t,
    account,
    patientProfile,
    updatePatientProfile,
    updateAccount,
    navigate,
    goBack,
    canGoBack,
  } = useApp();

  const [fullName, setFullName] = useState(
    patientProfile.fullName || account.fullName || ''
  );
  const [phoneNumber, setPhoneNumber] = useState(
    patientProfile.phoneNumber || account.phoneNumber || ''
  );
  const [age, setAge] = useState(patientProfile.age || '');
  const [sex, setSex] = useState<SexOption | null>(patientProfile.sex || null);
  const [hasDiabetes, setHasDiabetes] = useState<DiabetesOption | null>(
    patientProfile.hasDiabetes || null
  );

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isAgeFocused, setIsAgeFocused] = useState(false);

  const handleContinue = () => {
    updatePatientProfile({
      fullName,
      phoneNumber,
      age,
      sex,
      hasDiabetes,
    });
    updateAccount({
      fullName,
      phoneNumber,
    });
    navigate('dashboard');
  };

  const sexOptions: { label: string; value: SexOption }[] = [
    { label: t.female, value: 'Female' },
    { label: t.male, value: 'Male' },
    { label: t.other, value: 'Other' },
  ];

  const diabetesOptions: { label: string; value: DiabetesOption }[] = [
    { label: t.yes, value: 'Yes' },
    { label: t.notSure, value: 'Not sure' },
  ];

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
            <Text style={styles.tag}>{t.patientProfileTag}</Text>
            <Text style={styles.title}>{t.tellUsAboutYou}</Text>
            <Text style={styles.subtitle}>{t.tailorExperience}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.fullName}</Text>
              <TextInput
                style={[
                  styles.input,
                  isNameFocused && styles.inputFocused,
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t.namePlaceholder}
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                autoCapitalize="words"
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.mobileNumber}</Text>
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

            {/* Age */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.age}</Text>
              <TextInput
                style={[
                  styles.input,
                  isAgeFocused && styles.inputFocused,
                ]}
                value={age}
                onChangeText={setAge}
                placeholder={t.agePlaceholder}
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={3}
                onFocus={() => setIsAgeFocused(true)}
                onBlur={() => setIsAgeFocused(false)}
              />
            </View>

            {/* Sex Segmented Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.sex}</Text>
              <View style={styles.segmentedRow}>
                {sexOptions.map((opt) => {
                  const isSelected = sex === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentButton,
                        isSelected && styles.segmentButtonSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setSex(opt.value)}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          isSelected && styles.segmentButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Do you have diabetes Segmented Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.doYouHaveDiabetes}</Text>
              <View style={styles.segmentedRow}>
                {diabetesOptions.map((opt) => {
                  const isSelected = hasDiabetes === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentButton,
                        isSelected && styles.segmentButtonSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setHasDiabetes(opt.value)}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          isSelected && styles.segmentButtonTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    marginBottom: 26,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
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
    fontSize: 16,
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
    fontSize: 16,
    color: colors.textPrimary,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentButtonSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    borderWidth: 1.8,
  },
  segmentButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  segmentButtonTextSelected: {
    color: colors.primary,
    fontWeight: '700',
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
