import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const DoctorQueueScreen: React.FC = () => {
  const { goBack, screenings, viewReport } = useApp();

  const handleOpenReport = (screeningItem: (typeof screenings)[0]) => {
    viewReport(screeningItem);
  };

  const handleReviewCase = (item: (typeof screenings)[0]) => {
    Alert.alert(
      `Review: ${item.name}`,
      `Diagnosis: ${item.condition}\nStatus: ${item.status}\nAI Confidence: ${item.aiConfidence || 94}%\nImage Quality: ${item.imageQuality || 'Good'}\nCaptured by field worker with high-res fundus camera.`,
      [
        {
          text: 'Open Full Screening Report',
          onPress: () => handleOpenReport(item),
        },
        {
          text: 'Confirm AI Result',
          onPress: () => Alert.alert('Verified', 'Case confirmed and saved.'),
        },
        {
          text: 'Refer to Specialist',
          onPress: () => Alert.alert('Referred', 'Referral request generated.'),
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Arrow Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review queue</Text>
        </View>

        {/* List of Cases or Clean Empty State */}
        {screenings.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={38} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>
              No screenings currently awaiting doctor review. New screenings submitted by healthcare field workers will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {screenings.map((item) => (
              <View
                key={item.id}
                style={styles.queueCard}
              >
                <TouchableOpacity
                  style={styles.cardMainRow}
                  activeOpacity={0.7}
                  onPress={() => handleOpenReport(item)}
                >
                  {/* Initials Avatar */}
                  <View
                    style={[
                      styles.initialsBox,
                      item.status === 'REFERABLE' ? styles.initialsRed : styles.initialsMint,
                    ]}
                  >
                    <Text
                      style={[
                        styles.initialsText,
                        item.status === 'REFERABLE' ? styles.textRed : styles.textMint,
                      ]}
                    >
                      {item.initials || 'PT'}
                    </Text>
                  </View>

                  {/* Patient Info */}
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <Text style={styles.patientMeta}>
                      Age {item.age} · {item.date || 'Today'}
                    </Text>
                  </View>

                  {/* Condition & Status Badge */}
                  <View style={styles.statusCol}>
                    <Text style={styles.conditionText}>{item.condition}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'REFERABLE' ? styles.badgeRed : styles.badgeGreen,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.status === 'REFERABLE' ? styles.badgeTextRed : styles.badgeTextGreen,
                        ]}
                      >
                        {item.status === 'REFERABLE' ? 'REFERABLE' : 'NON-REF.'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Sub-row with AI Confidence, Quality & Worker Tag */}
                <View style={styles.metaRow}>
                  <View style={styles.aiPill}>
                    <Text style={styles.aiPillDot}>●</Text>
                    <Text style={styles.aiPillText}>
                      AI {item.aiConfidence || 94}% · {item.imageQuality || 'Good'}
                    </Text>
                  </View>
                  <View style={styles.capturedBadge}>
                    <Ionicons name="camera-outline" size={13} color="#1d4ed8" />
                    <Text style={styles.capturedBadgeText}>
                      Field Worker Capture
                    </Text>
                  </View>
                </View>

                {/* Direct Action Buttons for Doctor */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.viewReportActionBtn}
                    activeOpacity={0.8}
                    onPress={() => handleOpenReport(item)}
                  >
                    <Ionicons name="document-text-outline" size={15} color="#ffffff" />
                    <Text style={styles.viewReportActionBtnText}>
                      View Full Report
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickReviewBtn}
                    activeOpacity={0.8}
                    onPress={() => handleReviewCase(item)}
                  >
                    <Ionicons name="flash-outline" size={14} color={colors.textPrimary} />
                    <Text style={styles.quickReviewBtnText}>Quick Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8edf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  backArrow: {
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  queueList: {
    gap: 12,
  },
  queueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initialsBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsRed: {
    backgroundColor: '#fef2f2',
  },
  initialsAmber: {
    backgroundColor: '#fffbeb',
  },
  initialsMint: {
    backgroundColor: '#e6f3f4',
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
  },
  textRed: {
    color: '#ef4444',
  },
  textAmber: {
    color: '#d97706',
  },
  textMint: {
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  patientMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  conditionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
  },
  badgeAmber: {
    backgroundColor: '#fef3c7',
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeTextRed: {
    color: '#ef4444',
  },
  badgeTextAmber: {
    color: '#b45309',
  },
  badgeTextGreen: {
    color: '#10b981',
  },
  metaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 5,
  },
  aiPillDot: {
    fontSize: 8,
    color: '#0ea5e9',
  },
  aiPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  capturedBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capturedBadgeText: {
    fontSize: 10.5,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 9,
  },
  viewReportActionBtn: {
    flex: 1.4,
    height: 40,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  viewReportActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  quickReviewBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.2,
    borderColor: '#cbd5e1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickReviewBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8edf3',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
