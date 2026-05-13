export type EmotionKey =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised';

export type EmotionProfile = Record<EmotionKey, number>;

export interface FacialBackendMetrics {
  faceDetected: boolean;
  framesAnalyzed: number;
  faceDetectionRate: number;
  dominantEmotion: string;
  expressions: EmotionProfile;
  stressScore: number;
  fatigueScore: number;
  darkCircles: number;
  dullness: number;
  tensionIndex: number;
  note: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const emptyProfile = (): EmotionProfile => ({
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  fearful: 0,
  disgusted: 0,
  surprised: 0,
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    const fallback = 'Backend facial analysis failed.';
    let message = response.statusText || fallback;

    try {
      const payload = await response.json();
      message = payload.detail ?? fallback;
    } catch {
      message = response.statusText || fallback;
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function normalizeMetrics(metrics: FacialBackendMetrics): FacialBackendMetrics {
  const expressions = { ...emptyProfile(), ...(metrics.expressions ?? {}) };
  return {
    ...metrics,
    expressions,
  };
}

export function createEmptyEmotionProfile(): EmotionProfile {
  return emptyProfile();
}

export async function analyzeFacialVideo(video: File): Promise<FacialBackendMetrics> {
  const formData = new FormData();
  formData.append('video', video);

  const metrics = await request<FacialBackendMetrics>('/api/facial/video', {
    method: 'POST',
    body: formData,
  });

  return normalizeMetrics(metrics);
}
