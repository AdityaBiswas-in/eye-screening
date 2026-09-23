import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

interface QueueItem {
  id: string;
  initials: string;
  name: string;
  age: number;
  time: string;
  condition: string;
  status: 'REFERABLE' | 'UNCERTAIN' | 'NON-REF.';
  confidence: number;
  quality: 'Excellent' | 'Good' | 'Acceptable';
}

export const DoctorQueueScreen: React.FC = () => {
  const { navigate, goBack, screenings } = useApp();

  const queue: QueueItem[] = screenings.map((s) => ({
    id: s.id,
    initials: s.initials,
    name: s.name,
    age: typeof s.age === 'number' ? s.age : parseInt(s.age as string, 10) || 50,
    time: s.date || 'Today',
    condition: s.condition,
    status: (s.status === 'REFERABLE' ? 'REFERABLE' : 'NON-REF.') as
      | 'REFERABLE'
      | 'UNCERTAIN'
      | 'NON-REF.',
    confidence: 94,
    quality: 'Good' as const,
  }));

  const handleReviewCase = (item: QueueItem) => {
    Alert.alert(
      `Review: ${item.name}`,
      `Diagnosis: ${item.condition}\nStatus: ${item.status}\nAI Confidence: ${item.confidence}%\nImage Quality: ${item.quality}\n\nActions:`,
      [
        { text: 'Confirm AI Result', onPress: () => Alert.alert('Verified', 'Case confirmed and saved.') },
        { text: 'Refer to Specialist', onPress: () => Alert.alert('Referred', 'Referral request generated.') },
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
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review queue</Text>
        </View>

        {/* List of Cases or Clean Empty State */}
        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>
              No screenings currently awaiting doctor review. New screenings submitted by health workers will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {queue.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.queueCard}
              activeOpacity={0.8}
              onPress={() => handleReviewCase(item)}
            >
              <View style={styles.cardMainRow}>
                {/* Initials Avatar */}
                <View
                  style={[
                    styles.initialsBox,
                    item.status === 'REFERABLE' && styles.initialsRed,
                    item.status === 'UNCERTAIN' && styles.initialsAmber,
                    item.status === 'NON-REF.' && styles.initialsMint,
                  ]}
                >
                  <Text
                    style={[
                      styles.initialsText,
                      item.status === 'REFERABLE' && styles.textRed,
                      item.status === 'UNCERTAIN' && styles.textAmber,
                      item.status === 'NON-REF.' && styles.textMint,
                    ]}
                  >
                    {item.initials}
                  </Text>
                </View>

                {/* Patient Info */}
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientMeta}>
                    Age {item.age} · {item.time}
                  </Text>
                </View>

                {/* Condition & Status Badge */}
                <View style={styles.statusCol}>
                  <Text style={styles.conditionText}>{item.condition}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'REFERABLE' && styles.badgeRed,
                      item.status === 'UNCERTAIN' && styles.badgeAmber,
                      item.status === 'NON-REF.' && styles.badgeGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        item.status === 'REFERABLE' && styles.badgeTextRed,
                        item.status === 'UNCERTAIN' && styles.badgeTextAmber,
                        item.status === 'NON-REF.' && styles.badgeTextGreen,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sub-row with AI Confidence & Quality */}
              <View style={styles.metaRow}>
                <Text style={styles.metaRowText}>
                  Confidence: {item.confidence}% · Quality: {item.quality}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigate('doctorDashboard')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActive]}>📋</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => Alert.alert('Clinical Evidence', 'AI feature maps & Grad-CAM visual evidence.')}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Evidence</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 90,
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    alignItems: 'center',
  },
  metaRowText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 74,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  navActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primary,
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
