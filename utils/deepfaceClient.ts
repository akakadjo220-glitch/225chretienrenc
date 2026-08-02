/**
 * DeepFace Biometric Sovereignty Service Client
 * URL du microservice : https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io
 */

export interface DeepFaceCompareResult {
  verified: boolean;
  distance?: number;
  threshold?: number;
  model?: string;
  similarityPercentage?: number;
  error?: string;
}

export const DEFAULT_DEEPFACE_URL = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

export const checkDeepFaceHealth = async (apiUrl?: string): Promise<{ healthy: boolean; message: string }> => {
  const baseUrl = (apiUrl || DEFAULT_DEEPFACE_URL).replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return { healthy: true, message: data.status || 'Opérationnel' };
    }
    return { healthy: false, message: `HTTP ${res.status}` };
  } catch (e: any) {
    return { healthy: false, message: e.message || 'Serveur inatteignable' };
  }
};

export const compareFaces = async (
  image1Base64: string,
  image2Base64: string,
  options?: {
    apiUrl?: string;
    modelName?: string;
    detectorBackend?: string;
  }
): Promise<DeepFaceCompareResult> => {
  const baseUrl = (options?.apiUrl || DEFAULT_DEEPFACE_URL).replace(/\/+$/, '');
  const modelName = options?.modelName || 'ArcFace';
  const detectorBackend = options?.detectorBackend || 'retinaface';

  try {
    const params = new URLSearchParams();
    params.append('image1', image1Base64);
    params.append('image2', image2Base64);
    params.append('detector_backend', detectorBackend);
    params.append('model_name', modelName);

    const res = await fetch(`${baseUrl}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        verified: false,
        error: `Erreur serveur DeepFace (${res.status}): ${errText}`
      };
    }

    const data = await res.json();

    // Data format: { verified: boolean, distance: number, threshold: number, model: string }
    const isVerified = !!data.verified;
    const dist = typeof data.distance === 'number' ? data.distance : 0.5;
    const thresh = typeof data.threshold === 'number' ? data.threshold : 0.4;

    // Calcul du pourcentage de certitude biométrique (inversé par rapport à la distance)
    const percentage = isVerified
      ? Math.min(99, Math.max(80, Math.round((1 - (dist / Math.max(thresh * 2, 0.8))) * 100)))
      : Math.max(10, Math.round((1 - (dist / 1.0)) * 100));

    return {
      verified: isVerified,
      distance: dist,
      threshold: thresh,
      model: data.model || modelName,
      similarityPercentage: percentage
    };
  } catch (e: any) {
    console.error("Erreur DeepFace compare:", e);
    return {
      verified: false,
      error: `Erreur de connexion au service DeepFace: ${e.message || e}`
    };
  }
};
