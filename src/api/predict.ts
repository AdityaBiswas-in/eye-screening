import { Platform } from 'react-native';
import { SAMPLE_FUNDUS_BASE64 } from './sampleFundusBase64';

// ─── API Client for Eye Screening Backend ───────────────────────────────────
// Two endpoints: GET /health  and  POST /predict

let customApiBaseUrl: string | null = null;

export const CANDIDATE_URLS = [
  'http://127.0.0.1:8000',
  'http://10.225.139.141:8000',
  'http://localhost:8000',
  'http://10.0.2.2:8000',
];

export function setCustomApiBaseUrl(url: string | null) {
  customApiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  if (customApiBaseUrl) return customApiBaseUrl;
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      // On Windows, Chrome/Edge resolves 'localhost' to IPv6 [::1], where Uvicorn does not listen.
      // 127.0.0.1 enforces IPv4 and connects instantly.
      const ip = host === 'localhost' ? '127.0.0.1' : host;
      return `http://${ip}:8000`;
    }
    return 'http://127.0.0.1:8000';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();

// ─── Response Types ──────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  gradcam_loaded: boolean;
  model_experiment: string;
  checkpoint_epoch: number;
  device: string;
}

export interface ClassProbabilities {
  [label: string]: number;
}

export interface DrResult {
  grade: number;
  label: string;
  confidence: number;
  class_probabilities: ClassProbabilities;
}

export interface ReferableDr {
  prediction: boolean;
  probability: number;
}

export interface Uncertainty {
  level: string;
  conformal_prediction_set: string[];
}

export interface Reliability {
  review_required: boolean;
  review_reasons: string[];
}

export interface TechnicalQuality {
  valid: boolean;
  decision: string;
  reason?: string;
  focus?: { sharpness_laplacian_variance?: number };
  illumination?: { mean_luminance?: number };
  field_of_view?: { retinal_field_coverage?: number };
}

export interface ImageQuality {
  gradable: boolean;
  score?: number;
  issues?: string[];
  technical?: TechnicalQuality;
  [key: string]: unknown;
}

export interface LesionActivations {
  [lesion: string]: number;
}

export interface Lesions {
  activations: LesionActivations;
}

export interface Explainability {
  overlay_png_base64: string | null;
}

export interface Structures {
  optic_disc: string;
  fovea: string;
  vessels: string;
  neovascularization: string;
}

export interface PredictResponse {
  status: string;
  model: string;
  image_quality: ImageQuality;
  dr: DrResult;
  referable_dr: ReferableDr;
  uncertainty: Uncertainty;
  reliability: Reliability;
  lesions: Lesions;
  structures: Structures;
  explainability: Explainability;
  deployment: unknown;
  recommendation_status: string;
  recommendation: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

/** Helper to get ordered list of URLs to try */
function getUrlCandidates(): string[] {
  const primary = getApiBaseUrl();
  const list = [primary, ...CANDIDATE_URLS.filter((u) => u !== primary)];
  return Array.from(new Set(list));
}

/** GET /health — check if the model is loaded and ready */
export async function checkHealth(): Promise<HealthResponse> {
  const candidates = getUrlCandidates();
  let lastError: Error | null = null;

  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        // Cache this working URL for future requests
        setCustomApiBaseUrl(url);
        return (await res.json()) as HealthResponse;
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Health check failed on all candidates: ${lastError?.message || lastError}`);
}

function base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * POST /predict — upload a fundus image and get the full screening result.
 *
 * @param imageUri  - On web: a blob URL or data URL.
 *                  - On native: a file:// URI from expo-image-picker / expo-camera.
 * @param imageFile - On web pass the raw File object so FormData works correctly.
 */
export async function predictRetina(
  imageUri: string,
  imageFile?: File
): Promise<PredictResponse> {
  const buildFormData = async (): Promise<FormData> => {
    const formData = new FormData();

    if (imageFile) {
      // Web path with File object
      formData.append('image', imageFile, imageFile.name || 'fundus.jpg');
    } else if (Platform.OS === 'web') {
      let blob: Blob | null = null;
      if (imageUri && (imageUri.startsWith('blob:') || imageUri.startsWith('data:') || imageUri.startsWith('http'))) {
        try {
          const localRes = await fetch(imageUri);
          blob = await localRes.blob();
        } catch {
          // ignore error
        }
      }
      if (!blob || blob.size < 100) {
        // Fallback to real bundled fundus sample image
        blob = base64ToBlob(SAMPLE_FUNDUS_BASE64);
      }
      formData.append('image', blob, 'fundus.jpg');
    } else {
      // Native mobile path (Android / iOS React Native)
      const filename = imageUri ? imageUri.split('/').pop() || 'fundus.jpg' : 'fundus.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);
    }
    return formData;
  };

  const candidates = getUrlCandidates();
  let lastError: Error | null = null;

  for (const url of candidates) {
    try {
      const formData = await buildFormData();
      const res = await fetch(`${url}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setCustomApiBaseUrl(url);
        return (await res.json()) as PredictResponse;
      }
      const text = await res.text();
      throw new Error(`Predict error (${res.status}): ${text}`);
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Predict failed on all candidates: ${lastError?.message || lastError}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map lesion activations from the API into the EvidenceItem[] format */
export function mapLesionActivations(
  activations: LesionActivations
): { name: string; level: 'High' | 'Moderate' | 'Low' | 'None'; color: 'red' | 'amber' | 'green' | 'gray' }[] {
  const LESION_LABELS: Record<string, string> = {
    microaneurysms: 'Microaneurysm-like regions',
    hemorrhages: 'Hemorrhage-like regions',
    hard_exudates: 'Hard exudate-like regions',
    soft_exudates: 'Soft exudate-like regions',
    neovascularization: 'Neovascularization-like regions',
  };

  return Object.entries(activations).map(([key, score]) => {
    const name = LESION_LABELS[key] ?? key;
    let level: 'High' | 'Moderate' | 'Low' | 'None';
    let color: 'red' | 'amber' | 'green' | 'gray';

    if (score >= 0.7) { level = 'High'; color = 'red'; }
    else if (score >= 0.4) { level = 'Moderate'; color = 'amber'; }
    else if (score >= 0.1) { level = 'Low'; color = 'green'; }
    else { level = 'None'; color = 'green'; }

    return { name, level, color };
  });
}

/** Map image_quality from the API to the app's imageQuality label */
export function mapImageQuality(
  iq: ImageQuality
): 'Good' | 'Fair' | 'Unsatisfactory' | 'Poor' {
  if (!iq.gradable) return 'Poor';
  const score = typeof iq.score === 'number' ? iq.score : 1;
  if (score >= 0.85) return 'Good';
  if (score >= 0.65) return 'Fair';
  if (score >= 0.4) return 'Unsatisfactory';
  return 'Poor';
}
