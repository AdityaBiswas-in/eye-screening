import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export const PhoneVerificationScreen: React.FC = () => {
  const { goBack, pendingSignInPhone, setIsPendingPhoneVerified, savedAccountsForPhone, setVerifiedSignInAccounts } = useApp();
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const verifyPhone = async () => {
    if (code.length !== 6) {
      Alert.alert('Enter the verification code', 'Please enter the 6-digit code sent to your mobile number.');
      return;
    }
    const accounts = await savedAccountsForPhone(pendingSignInPhone);
    if (!accounts.length) {
      Alert.alert('Account not found', 'Check your mobile number, or create an account first.');
      return;
    }
    setVerifiedSignInAccounts(accounts);
    setIsPendingPhoneVerified(true);
    goBack();
  };

  const formattedPhone = pendingSignInPhone ? `+91 ${pendingSignInPhone.slice(0, 5)} ${pendingSignInPhone.slice(5)}` : '+91';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
      <View style={styles.container}>
        <View style={styles.topNavRow}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <RetinaAppBrand size={26} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>We sent a 6-digit verification code to</Text>
          <Text style={styles.phoneNumber}>{formattedPhone}</Text>

          <TouchableOpacity style={styles.codeBoxes} activeOpacity={1} onPress={() => inputRef.current?.focus()} accessibilityRole="button" accessibilityLabel="Verification code">
            {Array.from({ length: 6 }, (_, index) => (
              <View key={index} style={[styles.codeBox, code.length === index && styles.codeBoxActive]}>
                <Text style={styles.codeDigit}>{code[index] ?? ''}</Text>
              </View>
            ))}
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            autoFocus
            style={styles.hiddenInput}
            onSubmitEditing={verifyPhone}
          />

          <Text style={styles.resendText}>Didn’t receive a code?</Text>
          <TouchableOpacity onPress={() => Alert.alert('Code resent', `A new verification code was sent to ${formattedPhone}.`)} accessibilityRole="button">
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.verifyButton, code.length !== 6 && styles.verifyButtonDisabled]} activeOpacity={0.85} onPress={verifyPhone}>
          <Text style={styles.verifyButtonText}>Verify phone number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 22, paddingTop: 52, paddingBottom: 24 },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', paddingTop: 82 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  phoneNumber: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 6 },
  codeBoxes: { flexDirection: 'row', gap: 9, marginTop: 42 },
  codeBox: { width: 43, height: 54, borderRadius: 12, borderWidth: 1.2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  codeBoxActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  codeDigit: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, top: 260 },
  resendText: { color: colors.textMuted, fontSize: 14, marginTop: 32 },
  resendLink: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 6 },
  verifyButton: { height: 54, backgroundColor: colors.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 },
  verifyButtonDisabled: { opacity: 0.55 },
  verifyButtonText: { color: colors.textInverted, fontSize: 16, fontWeight: '700' },
});
