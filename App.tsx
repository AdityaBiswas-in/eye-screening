import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
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
  return (
    <AppProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <AppNavigator />
          <StatusBar style="dark" />
        </View>
      </SafeAreaView>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
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
