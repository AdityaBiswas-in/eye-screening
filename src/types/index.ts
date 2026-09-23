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
  patientId: string;
}

export interface WorkerProfile {
  fullName: string;
  phoneNumber?: string;
  healthcareCentre: string;
  organisation: string;
}

export interface EvidenceItem {
  name: string;
  level: 'High' | 'Moderate' | 'Low' | 'None';
  color: 'red' | 'amber' | 'green' | 'gray';
}

export interface ScreeningRecord {
  id: string;
  patientId?: string;
  initials: string;
  name: string;
  date: string;
  age: number | string;
  condition: string;
  status: 'REFERABLE' | 'NON-REFERABLE';
  // Clinical Report Fields
  drGrade?: string;
  aiConfidence?: number;
  imageQuality?: 'Good' | 'Fair' | 'Unsatisfactory' | 'Poor';
  imageQualityStatus?: 'done' | 'retake_needed' | 'verifying';
  imageQualityMessage?: string;
  evidence?: EvidenceItem[];
  recommendation?: string;
  recommendedDoctor?: {
    name: string;
    specialty: string;
    hospital: string;
    contact?: string;
    timeframe: string;
  };
  gradCamAttention?: string;
  capturedImageUri?: string;
  // Real API fields from POST /predict
  gradCamBase64?: string;           // explainability.overlay_png_base64
  uncertaintyLevel?: string;        // uncertainty.level
  referableDR?: boolean;            // referable_dr.prediction
  referableProbability?: number;    // referable_dr.probability
  reviewRequired?: boolean;         // reliability.review_required
  reviewReasons?: string[];         // reliability.review_reasons
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
  | 'signIn'
  | 'phoneVerification'
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
  | 'screeningHistory'
  | 'reportScreen';
