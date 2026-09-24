import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Platform } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { PhoneVerificationScreen } from './src/screens/PhoneVerificationScreen';
import { LanguageSelectScreen } from './src/screens/LanguageSelectScreen';
import { CreateAccountScreen } from './src/screens/CreateAccountScreen';
import { RoleSelectScreen } from './src/screens/RoleSelectScreen';
import { PatientProfileScreen } from './src/screens/PatientProfileScreen';
import { WorkerProfileScreen } from './src/screens/WorkerProfileScreen';
import { WorkerDashboardScreen } from './src/screens/WorkerDashboardScreen';
import { DoctorProfileScreen } from './src/screens/DoctorProfileScreen';
import { DoctorPendingScreen } from './src/screens/DoctorPendingScreen';
import { DoctorDashboardScreen } from './src/screens/DoctorDashboardScreen';
import { DoctorQueueScreen } from './src/screens/DoctorQueueScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { EyeCameraScreen } from './src/screens/EyeCameraScreen';
import { QualityCheckScreen } from './src/screens/QualityCheckScreen';
import { ScreeningHistoryScreen } from './src/screens/ScreeningHistoryScreen';
import { ReportScreen } from './src/screens/ReportScreen';

function AppNavigator() {
  const { currentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'signIn':
        return <SignInScreen />;
      case 'phoneVerification':
        return <PhoneVerificationScreen />;
      case 'language':
        return <LanguageSelectScreen />;
      case 'register':
        return <CreateAccountScreen />;
      case 'role':
        return <RoleSelectScreen />;
      case 'patientProfile':
        return <PatientProfileScreen />;
      case 'workerProfile':
        return <WorkerProfileScreen />;
      case 'workerDashboard':
        return <WorkerDashboardScreen />;
      case 'doctorProfile':
        return <DoctorProfileScreen />;
      case 'doctorPending':
        return <DoctorPendingScreen />;
      case 'doctorDashboard':
        return <DoctorDashboardScreen />;
      case 'doctorQueue':
        return <DoctorQueueScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'eyeCamera':
        return <EyeCameraScreen />;
      case 'qualityCheck':
        return <QualityCheckScreen />;
      case 'screeningHistory':
        return <ScreeningHistoryScreen />;
      case 'reportScreen':
        return <ReportScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {renderScreen()}
    </View>
  );
}

export default function App() {
  const isWeb = Platform.OS === 'web';

  return (
    <AppProvider>
      <View style={styles.rootBackground}>
        <View style={isWeb ? styles.webCenterContainer : styles.nativeContainer}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
              <AppNavigator />
              <StatusBar style="dark" />
            </View>
          </SafeAreaView>
        </View>
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  rootBackground: {
    flex: 1,
    height: '100%' as any,
    minHeight: '100%' as any,
    backgroundColor: Platform.OS === 'web' ? '#0f172a' : '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCenterContainer: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    maxHeight: 900,
    backgroundColor: '#f8fafc',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 36,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nativeContainer: {
    flex: 1,
    width: '100%',
    height: '100%' as any,
  },
  safeArea: {
    flex: 1,
    height: '100%' as any,
    minHeight: '100%' as any,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    height: '100%' as any,
    backgroundColor: '#f8fafc',
  },
  screenWrapper: {
    flex: 1,
    height: '100%' as any,
    backgroundColor: '#f8fafc',
  },
});
