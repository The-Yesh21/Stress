import * as faceapi from '@vladmandic/face-api';

export interface FacialEmotions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export class FaceTracker {
  private stream: MediaStream | null = null;
  private isLoaded = false;
  private emotionLog: FacialEmotions[] = [];
  
  // Model CDN URL
  private MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  async loadModels() {
    if (this.isLoaded) return;
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(this.MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
    ]);
    
    this.isLoaded = true;
  }

  async startCamera(videoElement: HTMLVideoElement) {
    console.log("Attempting to start camera...");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      console.log("Camera stream obtained, attaching to video element...");
      videoElement.srcObject = this.stream;
      
      return new Promise((resolve, reject) => {
        const onPlay = () => {
          console.log("Video playback started.");
          resolve(true);
        };

        videoElement.onloadedmetadata = () => {
          console.log("Video metadata loaded, calling play()...");
          videoElement.play()
            .then(onPlay)
            .catch(e => {
              console.error("Play failed:", e);
              reject(e);
            });
        };

        // Fallback in case onloadedmetadata doesn't fire
        if (videoElement.readyState >= 2) {
          console.log("Video already ready, calling play()...");
          videoElement.play()
            .then(onPlay)
            .catch(e => {
              console.error("Play failed (fallback):", e);
              reject(e);
            });
        }
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.emotionLog = [];
  }

  async analyzeFrame(videoElement: HTMLVideoElement) {
    if (!this.isLoaded) return null;

    const detections = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detections) {
      this.emotionLog.push(detections.expressions as unknown as FacialEmotions);
      
      // Advanced analysis
      const advanced = this.analyzeAdvancedFeatures(videoElement, detections);
      
      return {
        ...detections,
        advanced
      };
    }
    return null;
  }

  private analyzeAdvancedFeatures(video: HTMLVideoElement, detection: any) {
    const landmarks = detection.landmarks;
    const jaw = landmarks.getJawOutline();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // 1. Aspect Ratio (Face Tension)
    const top = jaw[0];
    const bottom = jaw[16];
    const width = Math.sqrt(Math.pow(bottom.x - top.x, 2) + Math.pow(bottom.y - top.y, 2));
    const height = Math.sqrt(Math.pow(jaw[8].x - (top.x + bottom.x)/2, 2) + Math.pow(jaw[8].y - (top.y + bottom.y)/2, 2));
    const aspectRatio = width / (height || 1);

    // 2. Dullness & Under Eye Darkness (Sample pixels)
    // Create a temporary canvas to sample pixel data
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      // Sample under-eye areas
      const sampleUnderEye = (eye: any[]) => {
        const x = Math.round(eye[0].x);
        const y = Math.round(eye[0].y + 15); // Shift down to under-eye
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        return (pixel[0] + pixel[1] + pixel[2]) / 3; // Brightness
      };

      const leftEyeBrightness = sampleUnderEye(leftEye);
      const rightEyeBrightness = sampleUnderEye(rightEye);
      const darkCircles = 255 - (leftEyeBrightness + rightEyeBrightness) / 2;

      // Overall face brightness (dullness)
      const centerX = Math.round(jaw[8].x);
      const centerY = Math.round((top.y + jaw[8].y) / 2);
      const centerPixel = ctx.getImageData(centerX, centerY, 1, 1).data;
      const dullness = 255 - (centerPixel[0] + centerPixel[1] + centerPixel[2]) / 3;

      return {
        aspectRatio,
        darkCircles: Math.min(100, (darkCircles / 255) * 100),
        dullness: Math.min(100, (dullness / 255) * 100)
      };
    }
    
    return { aspectRatio: 1, darkCircles: 0, dullness: 0 };
  }

  calculateInstantScore(expressions: FacialEmotions): number {
    const stressScore = (
      expressions.angry * 1.5 + 
      expressions.fearful * 1.5 + 
      expressions.sad * 1.2 + 
      expressions.disgusted * 1.0 +
      (1 - expressions.happy - expressions.neutral) * 0.5
    );
    return Math.max(0, Math.min(1, stressScore));
  }

  getFinalScore(): number {
    if (this.emotionLog.length === 0) return 0;

    const totals = this.emotionLog.reduce((acc, curr) => {
      acc.neutral += curr.neutral;
      acc.happy += curr.happy;
      acc.sad += curr.sad;
      acc.angry += curr.angry;
      acc.fearful += curr.fearful;
      acc.disgusted += curr.disgusted;
      acc.surprised += curr.surprised;
      return acc;
    }, { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 });

    const avg = {
      neutral: totals.neutral / this.emotionLog.length,
      happy: totals.happy / this.emotionLog.length,
      sad: totals.sad / this.emotionLog.length,
      angry: totals.angry / this.emotionLog.length,
      fearful: totals.fearful / this.emotionLog.length,
      disgusted: totals.disgusted / this.emotionLog.length,
      surprised: totals.surprised / this.emotionLog.length,
    };

    /**
     * Stress Calculation Logic:
     * - Negative/Tense: angry, fearful, sad, disgusted
     * - Relaxed: happy, neutral
     * - We weight tense emotions higher as indicators of stress.
     */
    const stressScore = (
      avg.angry * 1.5 + 
      avg.fearful * 1.5 + 
      avg.sad * 1.2 + 
      avg.disgusted * 1.0 +
      (1 - avg.happy - avg.neutral) * 0.5 // Contribution from lack of relaxed state
    );

    // Normalize to 0-1
    return Math.max(0, Math.min(1, stressScore));
  }
}

export const faceTracker = new FaceTracker();
