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
  addScreening: (record: ScreeningRecord) => void;
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
  const [patientProfile, setPatientProfile] = useState<PatientProfile>({
    fullName: '',
    phoneNumber: '',
    age: '',
    sex: null,
    hasDiabetes: null,
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
    setPatientProfile((prev) => ({ ...prev, ...updates }));
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

  const signOut = () => {
    setAccount({ fullName: '', phoneNumber: '', countryCode: '+91' });
    setPatientProfile({ fullName: '', phoneNumber: '', age: '', sex: null, hasDiabetes: null });
    setWorkerProfile({ fullName: '', phoneNumber: '', healthcareCentre: '', organisation: '' });
    setDoctorProfile({
      fullName: '',
      phoneNumber: '',
      regNumber: '',
      hospital: '',
      specialty: '',
      isVerified: false,
    });
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
        addScreening,
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
