import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RetinaAppBrand } from '../components/RetinaLogo';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { UserRole } from '../types';

const roleDetails: Record<UserRole, { label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = {
  patient: { label: 'Patient', description: 'View your eye screening and reports', icon: 'person-outline' },
  worker: { label: 'Health Worker', description: 'Screen patients and manage visits', icon: 'people-outline' },
  doctor: { label: 'Doctor', description: 'Review patient screening results', icon: 'medkit-outline' },
};

export const SignInScreen: React.FC = () => {
  const { t, goBack, signInWithPhone, navigate, pendingSignInPhone, setPendingSignInPhone, setIsPendingPhoneVerified, verifiedSignInAccounts, setVerifiedSignInAccounts } = useApp();
  const [phone, setPhone] = useState(pendingSignInPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const beginVerification = () => {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      Alert.alert('Enter a valid mobile number', 'Please enter your 10-digit mobile number.');
      return;
    }
    setPendingSignInPhone(normalizedPhone);
    setIsPendingPhoneVerified(false);
    setVerifiedSignInAccounts([]);
    navigate('phoneVerification');
  };

  const handleSignIn = async (role: UserRole) => {
    setIsSubmitting(true);
    const didSignIn = await signInWithPhone(phone, role);
    setIsSubmitting(false);
    if (!didSignIn) Alert.alert('Could not sign in', 'This account is no longer available. Please try again.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topNavRow}>
            <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t.back}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              <Text style={styles.backButtonText}>{t.back}</Text>
            </TouchableOpacity>
            <RetinaAppBrand size={26} />
          </View>

          <Text style={styles.title}>{t.signIn}</Text>
          <Text style={styles.subtitle}>
            {verifiedSignInAccounts.length ? 'Choose the account you want to use.' : 'Enter your mobile number to find your accounts.'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.mobileNumber}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCodeBox}><Text style={styles.countryCodeText}>+91</Text></View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/\D/g, ''));
                  setPendingSignInPhone('');
                  setIsPendingPhoneVerified(false);
                  setVerifiedSignInAccounts([]);
                }}
                placeholder="Mobile number"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            </View>
          </View>

          {verifiedSignInAccounts.length > 0 && (
            <View style={styles.accountChoices}>
              <Text style={styles.accountChoicesTitle}>CHOOSE AN ACCOUNT</Text>
              {verifiedSignInAccounts.map((savedAccount) => {
                const details = roleDetails[savedAccount.userRole];
                const name = savedAccount.account.fullName || details.label;
                return (
                  <TouchableOpacity
                    key={savedAccount.userRole}
                    style={styles.accountCard}
                    activeOpacity={0.8}
                    onPress={() => handleSignIn(savedAccount.userRole)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={`Sign in as ${name}, ${details.label}`}
                  >
                    <View style={styles.accountIcon}><Ionicons name={details.icon} size={22} color={colors.primary} /></View>
                    <View style={styles.accountText}>
                      <Text style={styles.accountName}>{name}</Text>
                      <Text style={styles.accountRole}>{details.label} · {details.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.signInButton, isSubmitting && styles.signInButtonDisabled]}
          activeOpacity={0.85}
          onPress={() => {
            if (verifiedSignInAccounts.length) {
              setVerifiedSignInAccounts([]);
              setPendingSignInPhone('');
              setIsPendingPhoneVerified(false);
              return;
            }
            beginVerification();
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.signInButtonText}>{isSubmitting ? 'Signing in…' : verifiedSignInAccounts.length ? 'Use a different number' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 22, paddingTop: 52, paddingBottom: 24 },
  scrollContent: { flexGrow: 1 },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 34 },
  inputGroup: { gap: 8 },
  inputLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodeBox: { backgroundColor: '#ffffff', width: 66, height: 54, borderRadius: 16, borderWidth: 1.2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  countryCodeText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  phoneInput: { flex: 1, backgroundColor: '#ffffff', height: 54, borderRadius: 16, borderWidth: 1.2, borderColor: '#e2e8f0', paddingHorizontal: 16, fontSize: 16, color: colors.textPrimary },
  accountChoices: { marginTop: 28, gap: 10 },
  accountChoicesTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderWidth: 1.2, borderColor: '#e2e8f0', borderRadius: 16, padding: 14 },
  accountIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#eef6ff', alignItems: 'center', justifyContent: 'center' },
  accountText: { flex: 1, gap: 2 },
  accountName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  accountRole: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  signInButton: { height: 54, backgroundColor: colors.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 },
  signInButtonDisabled: { opacity: 0.65 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
