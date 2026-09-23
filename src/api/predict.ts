// ─── API Client for Eye Screening Backend ───────────────────────────────────
// Two endpoints: GET /health  and  POST /predict

// 👉 Change this to your server's IP/URL when running on a physical device
// e.g. 'http://192.168.1.42:8000' or a cloud URL
export const API_BASE_URL = 'http://localhost:8000';

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

export interface ImageQuality {
  gradable: boolean;
  score?: number;
  issues?: string[];
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

/** GET /health — check if the model is loaded and ready */
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<HealthResponse>;
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
  const formData = new FormData();

  if (imageFile) {
    // Web path — use the actual File object
    formData.append('image', imageFile, imageFile.name || 'fundus.jpg');
  } else {
    // Native path — fetch the URI as a blob then append
    const localRes = await fetch(imageUri);
    const blob = await localRes.blob();
    formData.append('image', blob, 'fundus.jpg');
  }

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type manually — fetch sets multipart boundary automatically
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Predict failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<PredictResponse>;
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
