import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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
  savedAccountsForPhone: (phoneNumber: string) => Promise<SavedAccount[]>;
  signInWithPhone: (phoneNumber: string, role: UserRole) => Promise<boolean>;
  pendingSignInPhone: string;
  setPendingSignInPhone: (phoneNumber: string) => void;
  isPendingPhoneVerified: boolean;
  setIsPendingPhoneVerified: (isVerified: boolean) => void;
  verifiedSignInAccounts: SavedAccount[];
  setVerifiedSignInAccounts: (accounts: SavedAccount[]) => void;
  // Captured image passed from EyeCameraScreen → QualityCheckScreen → API
  capturedImageUri: string | null;
  capturedImageFile: File | null;
  setCapturedImage: (uri: string | null, file?: File | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SAVED_ACCOUNT_KEY = 'retinacare.saved-accounts.v2';
const LEGACY_SAVED_ACCOUNT_KEY = 'retinacare.saved-account.v1';
const LANGUAGE_KEY = 'retinacare.language.v1';

export interface SavedAccount {
  account: UserAccount;
  userRole: UserRole;
  patientProfile: PatientProfile;
  workerProfile: WorkerProfile;
  doctorProfile: DoctorProfile;
}

interface SavedAccountsStore {
  accounts: SavedAccount[];
}

const saveLocally = async (value: string, key = SAVED_ACCOUNT_KEY) => {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const readLocally = async (key = SAVED_ACCOUNT_KEY) => {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
};

const readSavedAccounts = async (): Promise<SavedAccount[]> => {
  const savedValue = await readLocally();
  if (savedValue) {
    const savedStore = JSON.parse(savedValue) as SavedAccountsStore;
    return Array.isArray(savedStore.accounts) ? savedStore.accounts : [];
  }

  // Keep accounts created before multi-role sign-in available after the update.
  const legacyValue = await readLocally(LEGACY_SAVED_ACCOUNT_KEY);
  if (!legacyValue) return [];
  const legacyAccount = JSON.parse(legacyValue) as SavedAccount;
  return legacyAccount.account ? [legacyAccount] : [];
};

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
  const [pendingSignInPhone, setPendingSignInPhone] = useState('');
  const [isPendingPhoneVerified, setIsPendingPhoneVerified] = useState(false);
  const [verifiedSignInAccounts, setVerifiedSignInAccounts] = useState<SavedAccount[]>([]);

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
  const [isRestoring, setIsRestoring] = useState(true);

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
    saveLocally(JSON.stringify({ language: lang }), LANGUAGE_KEY).catch(() => {
      // The selected language remains active for this session if storage is unavailable.
    });
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

  useEffect(() => {
    const restoreStorage = async () => {
      // Wait until local storage is checked before writing any new account data.
      try {
        const savedLanguage = await readLocally(LANGUAGE_KEY);
        if (savedLanguage) {
          const parsed = JSON.parse(savedLanguage) as { language?: SupportedLanguage };
          if (parsed.language && parsed.language in translations) {
            setLanguageState(parsed.language);
          }
        }
      } catch {
        // Use English when the stored language is unavailable or invalid.
      }
      setIsRestoring(false);
    };
    restoreStorage();
  }, []);

  useEffect(() => {
    if (isRestoring || !account.fullName.trim() || !account.phoneNumber.trim()) return;

    const savedAccount: SavedAccount = {
      account,
      userRole,
      patientProfile,
      workerProfile,
      doctorProfile,
    };
    readSavedAccounts()
      .then((accounts) => {
        const accountIndex = accounts.findIndex(
          (item) => item.account.phoneNumber === account.phoneNumber && item.userRole === userRole,
        );
        const updatedAccounts = [...accounts];
        if (accountIndex >= 0) updatedAccounts[accountIndex] = savedAccount;
        else updatedAccounts.push(savedAccount);
        return saveLocally(JSON.stringify({ accounts: updatedAccounts } satisfies SavedAccountsStore));
      })
      .catch(() => {
      // The account remains usable for this session if local storage is unavailable.
      });
  }, [account, doctorProfile, isRestoring, patientProfile, userRole, workerProfile]);

  const savedAccountsForPhone = async (phoneNumber: string) => {
    try {
      const accounts = await readSavedAccounts();
      return accounts.filter((item) => item.account.phoneNumber === phoneNumber.trim());
    } catch {
      return [];
    }
  };

  const signInWithPhone = async (phoneNumber: string, role: UserRole) => {
    try {
      const accounts = await savedAccountsForPhone(phoneNumber);
      const savedAccount = accounts.find((item) => item.userRole === role);
      if (!savedAccount) return false;

      setAccount(savedAccount.account);
      setUserRole(savedAccount.userRole);
      setPatientProfile(savedAccount.patientProfile);
      setWorkerProfile(savedAccount.workerProfile);
      setDoctorProfile(savedAccount.doctorProfile);
      setScreenStack([
        savedAccount.userRole === 'doctor'
          ? 'doctorDashboard'
          : savedAccount.userRole === 'worker'
            ? 'workerDashboard'
            : 'dashboard',
      ]);
      return true;
    } catch {
      return false;
    }
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
        savedAccountsForPhone,
        signInWithPhone,
        pendingSignInPhone,
        setPendingSignInPhone,
        isPendingPhoneVerified,
        setIsPendingPhoneVerified,
        verifiedSignInAccounts,
        setVerifiedSignInAccounts,
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
