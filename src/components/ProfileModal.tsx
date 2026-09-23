import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    userRole,
    patientProfile,
    workerProfile,
    doctorProfile,
    account,
    navigate,
    signOut,
  } = useApp();

  if (!visible) return null;

  const roleTitle =
    userRole === 'patient'
      ? 'Patient'
      : userRole === 'worker'
      ? 'Screening Worker'
      : 'Doctor';

  const name =
    userRole === 'patient'
      ? patientProfile.fullName || account.fullName || 'Patient User'
      : userRole === 'worker'
      ? workerProfile.fullName || account.fullName || 'Health Worker'
      : doctorProfile.fullName || account.fullName || 'Doctor';

  const phone =
    account.phoneNumber ||
    patientProfile.phoneNumber ||
    workerProfile.phoneNumber ||
    doctorProfile.phoneNumber ||
    'Not provided';

  const initials = name
    .trim()
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  const handleEditProfile = () => {
    onClose();
    if (userRole === 'patient') {
      navigate('patientProfile');
    } else if (userRole === 'worker') {
      navigate('workerProfile');
    } else {
      navigate('doctorProfile');
    }
  };

  const handleSignOut = () => {
    onClose();
    signOut();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* Header Row */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.sheetTag}>RETINACARE ACCOUNT</Text>
              <Text style={styles.sheetTitle}>Profile Details</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            {/* User Avatar & Basic Info Card */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleTitle}</Text>
                </View>
              </View>
            </View>

            {/* Profile Information List */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>CONTACT & IDENTITY</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>+91 {phone}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Role</Text>
                <Text style={styles.infoValue}>{roleTitle}</Text>
              </View>
            </View>

            {/* Role Specific Details */}
            {userRole === 'patient' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>CLINICAL BACKGROUND</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>
                    {patientProfile.age ? `${patientProfile.age} yrs` : 'Not set'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sex</Text>
                  <Text style={styles.infoValue}>
                    {patientProfile.sex || 'Not set'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Diabetes History</Text>
                  <Text style={styles.infoValue}>
                    {patientProfile.hasDiabetes || 'Not set'}
                  </Text>
                </View>
              </View>
            )}

            {userRole === 'worker' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>ORGANIZATION</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Health Centre</Text>
                  <Text style={styles.infoValue}>
                    {workerProfile.healthcareCentre || 'Primary Health Centre'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Organization</Text>
                  <Text style={styles.infoValue}>
                    {workerProfile.organisation || 'Community Health Dept'}
                  </Text>
                </View>
              </View>
            )}

            {userRole === 'doctor' && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>MEDICAL CREDENTIALS</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Specialty</Text>
                  <Text style={styles.infoValue}>
                    {doctorProfile.specialty || 'Ophthalmology'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hospital</Text>
                  <Text style={styles.infoValue}>
                    {doctorProfile.hospital || 'Eye Care Hospital'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reg Number</Text>
                  <Text style={styles.infoValue}>
                    {doctorProfile.regNumber || 'MCI-84920'}
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.85}
                onPress={handleEditProfile}
              >
                <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signOutBtn}
                activeOpacity={0.8}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutBtnText}>🚪 Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  sheetTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 3,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sheetContent: {
    paddingBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8edf3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#94a3b8',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  actionsContainer: {
    marginTop: 10,
    gap: 10,
  },
  editBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  signOutBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
