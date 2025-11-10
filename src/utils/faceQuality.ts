export interface FaceQualityMetrics {
  distance: 'too-close' | 'optimal' | 'too-far' | 'unknown';
  lighting: 'dark' | 'optimal' | 'bright' | 'unknown';
  angle: 'good' | 'tilted' | 'unknown';
  overallScore: number; // 0-100
}

export function assessFaceQuality(
  detection: any,
  videoWidth: number,
  videoHeight: number
): FaceQualityMetrics {
  if (!detection) {
    return {
      distance: 'unknown',
      lighting: 'unknown',
      angle: 'unknown',
      overallScore: 0,
    };
  }

  const box = detection.detection.box;
  const landmarks = detection.landmarks;

  // Assess distance based on face box size
  const faceArea = box.width * box.height;
  const videoArea = videoWidth * videoHeight;
  const faceRatio = faceArea / videoArea;

  let distance: FaceQualityMetrics['distance'];
  let distanceScore = 0;

  if (faceRatio > 0.35) {
    distance = 'too-close';
    distanceScore = 50;
  } else if (faceRatio < 0.08) {
    distance = 'too-far';
    distanceScore = 40;
  } else {
    distance = 'optimal';
    distanceScore = 100;
  }

  // Assess lighting based on detection confidence
  const confidence = detection.detection.score;
  let lighting: FaceQualityMetrics['lighting'];
  let lightingScore = 0;

  if (confidence > 0.9) {
    lighting = 'optimal';
    lightingScore = 100;
  } else if (confidence > 0.7) {
    lighting = 'optimal';
    lightingScore = 80;
  } else if (confidence > 0.5) {
    lighting = 'dark';
    lightingScore = 60;
  } else {
    lighting = 'dark';
    lightingScore = 30;
  }

  // Assess face angle using landmarks
  let angle: FaceQualityMetrics['angle'] = 'good';
  let angleScore = 100;

  if (landmarks) {
    const leftEye = landmarks.positions[36]; // Left eye outer corner
    const rightEye = landmarks.positions[45]; // Right eye outer corner
    const nose = landmarks.positions[30]; // Nose tip

    if (leftEye && rightEye && nose) {
      // Calculate eye distance
      const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
      );

      // Calculate nose position relative to eyes
      const noseCenterX = (leftEye.x + rightEye.x) / 2;
      const horizontalDeviation = Math.abs(nose.x - noseCenterX) / eyeDistance;

      // Check for tilt
      const eyeAngle = Math.abs(
        Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI)
      );

      if (horizontalDeviation > 0.2 || eyeAngle > 15) {
        angle = 'tilted';
        angleScore = 60;
      }
    }
  }

  // Calculate overall score
  const overallScore = Math.round((distanceScore + lightingScore + angleScore) / 3);

  return {
    distance,
    lighting,
    angle,
    overallScore,
  };
}

export function getQualityFeedbackMessage(metrics: FaceQualityMetrics): string {
  const messages: string[] = [];

  if (metrics.distance === 'too-close') {
    messages.push('Move back a bit');
  } else if (metrics.distance === 'too-far') {
    messages.push('Move closer');
  }

  if (metrics.lighting === 'dark') {
    messages.push('Improve lighting');
  } else if (metrics.lighting === 'bright') {
    messages.push('Reduce brightness');
  }

  if (metrics.angle === 'tilted') {
    messages.push('Face camera directly');
  }

  if (messages.length === 0) {
    return 'Perfect! Ready to capture';
  }

  return messages.join(' • ');
}
