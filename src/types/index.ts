export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'bn'
  | 'ta'
  | 'te'
  | 'mr'
  | 'kn'
  | 'ml'
  | 'gu';

export interface LanguageOption {
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
}

export type UserRole = 'patient' | 'worker' | 'doctor';

export type SexOption = 'Female' | 'Male' | 'Other';

export type DiabetesOption = 'Yes' | 'Not sure';

export interface UserAccount {
  fullName: string;
  phoneNumber: string;
  countryCode: string;
}

export interface PatientProfile {
  fullName: string;
  phoneNumber?: string;
  age: string;
  sex: SexOption | null;
  hasDiabetes: DiabetesOption | null;
}

export interface WorkerProfile {
  fullName: string;
  phoneNumber?: string;
  healthcareCentre: string;
  organisation: string;
}

export interface ScreeningRecord {
  id: string;
  initials: string;
  name: string;
  date: string;
  age: number | string;
  condition: string;
  status: 'REFERABLE' | 'NON-REFERABLE';
}

export interface DoctorProfile {
  fullName: string;
  phoneNumber?: string;
  regNumber: string;
  hospital: string;
  specialty: string;
  isVerified: boolean;
}

export type ScreenType =
  | 'welcome'
  | 'language'
  | 'register'
  | 'role'
  | 'patientProfile'
  | 'workerProfile'
  | 'workerDashboard'
  | 'doctorProfile'
  | 'doctorPending'
  | 'doctorDashboard'
  | 'doctorQueue'
  | 'dashboard'
  | 'eyeCamera'
  | 'qualityCheck'
  | 'screeningHistory';
