import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const DoctorPendingScreen: React.FC = () => {
  const { navigate } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Soft Green Checkmark Badge */}
        <View style={styles.checkCircleWrapper}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMarkIcon}>✓</Text>
          </View>
        </View>

        {/* Status Headings */}
        <Text style={styles.title}>Submitted</Text>
        <Text style={styles.subtitle}>
          Your professional details are being reviewed.{'\n'}
          You will be notified once your account is verified.
        </Text>

        {/* Verification Pending Notice Box */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTag}>VERIFICATION PENDING</Text>
          <Text style={styles.noticeText}>
            Your account is being reviewed. You will be notified once verified.
          </Text>
        </View>
      </View>

      {/* Continue to Dashboard Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.85}
          onPress={() => navigate('doctorDashboard')}
        >
          <Text style={styles.continueButtonText}>Continue to dashboard</Text>
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
    paddingTop: 80,
    paddingBottom: 28,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  checkCircleWrapper: {
    marginBottom: 28,
  },
  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e8fdf2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  checkMarkIcon: {
    color: '#10b981',
    fontSize: 42,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 34,
    maxWidth: 290,
  },
  noticeCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8edf3',
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noticeTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
