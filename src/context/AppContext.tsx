import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  PatientProfile,
  ScreenType,
  SupportedLanguage,
  UserAccount,
  UserRole,
  WorkerProfile,
  ScreeningRecord,
  DoctorProfile,
} from '../types';
import { translations, Translations } from '../i18n/translations';

// Helper to generate a short unique patient ID like PAT-A1B2C3
const generatePatientId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PAT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface AppContextType {
  currentScreen: ScreenType;
  language: SupportedLanguage;
  t: Translations;
  userRole: UserRole;
  account: UserAccount;
  patientProfile: PatientProfile;
  workerProfile: WorkerProfile;
  doctorProfile: DoctorProfile;
  screenings: ScreeningRecord[];
  activeReportRecord: ScreeningRecord | null;
  addScreening: (record: ScreeningRecord) => void;
  setActiveReportRecord: (record: ScreeningRecord | null) => void;
  viewReport: (record: ScreeningRecord) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setUserRole: (role: UserRole) => void;
  updateAccount: (updates: Partial<UserAccount>) => void;
  updatePatientProfile: (updates: Partial<PatientProfile>) => void;
  updateWorkerProfile: (updates: Partial<WorkerProfile>) => void;
  updateDoctorProfile: (updates: Partial<DoctorProfile>) => void;
  navigate: (screen: ScreenType) => void;
  goBack: () => void;
  canGoBack: boolean;
  signOut: () => void;
  // Captured image passed from EyeCameraScreen → QualityCheckScreen → API
  capturedImageUri: string | null;
  capturedImageFile: File | null;
  setCapturedImage: (uri: string | null, file?: File | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [screenStack, setScreenStack] = useState<ScreenType[]>(['welcome']);
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [userRole, setUserRole] = useState<UserRole>('patient');
  const [account, setAccount] = useState<UserAccount>({
    fullName: '',
    phoneNumber: '',
    countryCode: '+91',
  });
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [activeReportRecord, setActiveReportRecord] = useState<ScreeningRecord | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedImageFile, setCapturedImageFile] = useState<File | null>(null);

  const setCapturedImage = (uri: string | null, file: File | null = null) => {
    setCapturedImageUri(uri);
    setCapturedImageFile(file);
  };
  const [patientProfile, setPatientProfile] = useState<PatientProfile>({
    fullName: '',
    phoneNumber: '',
    age: '',
    sex: null,
    hasDiabetes: null,
    patientId: '',
  });
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile>({
    fullName: '',
    phoneNumber: '',
    healthcareCentre: '',
    organisation: '',
  });
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    fullName: '',
    phoneNumber: '',
    regNumber: '',
    hospital: '',
    specialty: '',
    isVerified: false,
  });

  const currentScreen = screenStack[screenStack.length - 1];
  const canGoBack = screenStack.length > 1;

  const navigate = (screen: ScreenType) => {
    setScreenStack((prev) => [...prev, screen]);
  };

  const goBack = () => {
    setScreenStack((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      // If stack is at root, return to role dashboard
      if (userRole === 'doctor') return ['doctorDashboard'];
      if (userRole === 'worker') return ['workerDashboard'];
      return ['dashboard'];
    });
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const updateAccount = (updates: Partial<UserAccount>) => {
    setAccount((prev) => ({ ...prev, ...updates }));
  };

  const updatePatientProfile = (updates: Partial<PatientProfile>) => {
    setPatientProfile((prev) => {
      // Auto-generate a patientId the first time if not already set
      const patientId = prev.patientId || generatePatientId();
      return { ...prev, ...updates, patientId };
    });
  };

  const updateWorkerProfile = (updates: Partial<WorkerProfile>) => {
    setWorkerProfile((prev) => ({ ...prev, ...updates }));
  };

  const updateDoctorProfile = (updates: Partial<DoctorProfile>) => {
    setDoctorProfile((prev) => ({ ...prev, ...updates }));
  };

  const addScreening = (record: ScreeningRecord) => {
    setScreenings((prev) => [record, ...prev]);
  };

  const viewReport = (record: ScreeningRecord) => {
    setActiveReportRecord(record);
    navigate('reportScreen');
  };

  const signOut = () => {
    setAccount({ fullName: '', phoneNumber: '', countryCode: '+91' });
    setPatientProfile({ fullName: '', phoneNumber: '', age: '', sex: null, hasDiabetes: null, patientId: '' });
    setWorkerProfile({ fullName: '', phoneNumber: '', healthcareCentre: '', organisation: '' });
    setDoctorProfile({
      fullName: '',
      phoneNumber: '',
      regNumber: '',
      hospital: '',
      specialty: '',
      isVerified: false,
    });
    setActiveReportRecord(null);
    setUserRole('patient');
    setScreenStack(['welcome']);
  };

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        language,
        t,
        userRole,
        account,
        patientProfile,
        workerProfile,
        doctorProfile,
        screenings,
        activeReportRecord,
        addScreening,
        setActiveReportRecord,
        viewReport,
        setLanguage,
        setUserRole,
        updateAccount,
        updatePatientProfile,
        updateWorkerProfile,
        updateDoctorProfile,
        navigate,
        goBack,
        canGoBack,
        signOut,
        capturedImageUri,
        capturedImageFile,
        setCapturedImage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
