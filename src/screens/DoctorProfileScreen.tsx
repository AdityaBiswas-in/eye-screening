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

export const DoctorProfileScreen: React.FC = () => {
  const {
    t,
    account,
    doctorProfile,
    updateDoctorProfile,
    updateAccount,
    navigate,
    goBack,
    canGoBack,
  } = useApp();

  const [fullName, setFullName] = useState(
    doctorProfile.fullName || account.fullName || ''
  );
  const [phoneNumber, setPhoneNumber] = useState(
    doctorProfile.phoneNumber || account.phoneNumber || ''
  );
  const [regNumber, setRegNumber] = useState(doctorProfile.regNumber || '');
  const [hospital, setHospital] = useState(doctorProfile.hospital || '');
  const [specialty, setSpecialty] = useState(
    doctorProfile.specialty || ''
  );

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isRegFocused, setIsRegFocused] = useState(false);
  const [isHospFocused, setIsHospFocused] = useState(false);
  const [isSpecFocused, setIsSpecFocused] = useState(false);

  const handleSubmit = () => {
    updateDoctorProfile({
      fullName,
      phoneNumber,
      regNumber,
      hospital,
      specialty,
      isVerified: true,
    });
    updateAccount({
      fullName,
      phoneNumber,
    });
    navigate('doctorDashboard');
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
            <Text style={styles.tag}>DOCTOR / OPHTHALMOLOGIST</Text>
            <Text style={styles.title}>Professional details</Text>
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
                placeholder="e.g. Dr. Arjun Mehta"
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

            {/* Medical Registration Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MEDICAL REGISTRATION NUMBER</Text>
              <TextInput
                style={[styles.input, isRegFocused && styles.inputFocused]}
                value={regNumber}
                onChangeText={setRegNumber}
                placeholder="e.g. MCI-2004-12345"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsRegFocused(true)}
                onBlur={() => setIsRegFocused(false)}
                autoCapitalize="characters"
              />
            </View>

            {/* Hospital / Clinic */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>HOSPITAL / CLINIC</Text>
              <TextInput
                style={[styles.input, isHospFocused && styles.inputFocused]}
                value={hospital}
                onChangeText={setHospital}
                placeholder="e.g. AIIMS Hyderabad"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsHospFocused(true)}
                onBlur={() => setIsHospFocused(false)}
              />
            </View>

            {/* Specialty */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SPECIALTY</Text>
              <TextInput
                style={[styles.input, isSpecFocused && styles.inputFocused]}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="e.g. Ophthalmology"
                placeholderTextColor={colors.textLight}
                onFocus={() => setIsSpecFocused(true)}
                onBlur={() => setIsSpecFocused(false)}
              />
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.85}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit for verification</Text>
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
    marginBottom: 30,
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
  bottomSection: {
    paddingTop: 16,
  },
  submitButton: {
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
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
