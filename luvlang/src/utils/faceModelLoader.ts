
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { waitForVideoElement } from './cameraValidation';

export const loadFaceModel = async (): Promise<faceLandmarksDetection.FaceLandmarksDetector> => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const logToConsole = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logLevel = isProduction ? 'PROD' : 'DEV';
    console.log(`[${timestamp}] ${logLevel}: ${message}`, data || '');
  };

  logToConsole('🧪 SIMPLE: Loading FaceMesh model...');
  
  try {
    const model = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      {
        runtime: 'tfjs',
        refineLandmarks: false,
        maxFaces: 1
      }
    );
    
    logToConsole('✅ SIMPLE: Model loaded successfully');
    return model;
  } catch (error) {
    logToConsole('❌ SIMPLE: Face model loading failed', error);
    throw new Error('Face detection model failed to load: ' + (error as Error).message);
  }
};

export const testModelWithVideo = async (
  model: faceLandmarksDetection.FaceLandmarksDetector,
  videoRef: React.RefObject<HTMLVideoElement>
): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const logToConsole = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logLevel = isProduction ? 'PROD' : 'DEV';
    console.log(`[${timestamp}] ${logLevel}: ${message}`, data || '');
  };

  logToConsole('🧪 SIMPLE: Testing face detection...');
  
  if (!videoRef.current) {
    throw new Error('Video element not available for testing');
  }

  // Wait a moment for video to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const faces = await model.estimateFaces(videoRef.current, {
      flipHorizontal: false,
      staticImageMode: false
    });
    
    logToConsole('🧪 SIMPLE: Face detection result:', faces);
    logToConsole(`✅ SIMPLE: Test complete! Found ${faces.length} face(s)`);
    
  } catch (error) {
    logToConsole('❌ SIMPLE: Face detection test failed', error);
    throw new Error('Face detection test failed: ' + (error as Error).message);
  }
};
