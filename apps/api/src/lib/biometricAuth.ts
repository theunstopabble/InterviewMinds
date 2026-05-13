interface BiometricTemplate {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint';
  templateData: string;
  createdAt: string;
  lastVerified: string;
  isActive: boolean;
}

interface BiometricEnrollment {
  userId: string;
  faceTemplate?: string;
  voiceTemplate?: string;
  fingerprintTemplate?: string;
  status: 'pending' | 'enrolled' | 'failed';
}

interface BiometricVerificationResult {
  success: boolean;
  confidence: number;
  livenessVerified: boolean;
  details: string;
}

interface BiometricSettings {
  enabled: boolean;
  requiredForAccess: boolean;
  allowMultipleTypes: boolean;
  enrolledTypes: ('face' | 'voice' | 'fingerprint')[];
  livenessDetection: boolean;
}

const enrolledUsers: Map<string, BiometricEnrollment> = new Map();
const verificationAttempts: Map<string, { attempts: number; lastAttempt: string }> = new Map();

function generateTemplateId(): string {
  return `bio_${crypto.randomUUID().slice(0, 12)}`;
}

function encodeFaceTemplate(faceData: number[]): string {
  return Buffer.from(faceData.slice(0, 128)).toString('base64');
}

function encodeVoiceTemplate(audioFeatures: number[]): string {
  return Buffer.from(audioFeatures.slice(0, 256)).toString('base64');
}

function encodeFingerprintTemplate(fingerprintData: number[]): string {
  return Buffer.from(fingerprintData.slice(0, 64)).toString('base64');
}

function compareFaceTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');
    
    let matchingBits = 0;
    const compareLength = Math.min(data1.length, data2.length);
    
    for (let i = 0; i < compareLength; i++) {
      const xor = data1[i] ^ data2[i];
      for (let j = 0; j < 8; j++) {
        if ((xor & (1 << j)) === 0) matchingBits++;
      }
    }
    
    return (matchingBits / (compareLength * 8)) * 100;
  } catch {
    return 0;
  }
}

function compareVoiceTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');
    
    let similarity = 0;
    const samples = Math.min(data1.length, data2.length);
    
    for (let i = 0; i < samples; i++) {
      const diff = Math.abs(data1[i] - data2[i]);
      if (diff < 10) similarity++;
    }
    
    return (similarity / samples) * 100;
  } catch {
    return 0;
  }
}

function compareFingerprintTemplates(template1: string, template2: string): number {
  try {
    const data1 = Buffer.from(template1, 'base64');
    const data2 = Buffer.from(template2, 'base64');
    
    let matchingPoints = 0;
    const totalPoints = Math.min(data1.length, data2.length);
    
    for (let i = 0; i < totalPoints; i++) {
      const diff = Math.abs(data1[i] - data2[i]);
      if (diff < 5) matchingPoints++;
    }
    
    return (matchingPoints / totalPoints) * 100;
  } catch {
    return 0;
  }
}

function checkLiveness(sessionData: Record<string, unknown>): boolean {
  const requiredChecks = ['face_movement', 'blink_detected', 'light_consistency'];
  const passedChecks = requiredChecks.filter(check => sessionData[check] === true);
  
  return passedChecks.length >= 2;
}

export function enrollFace(userId: string, faceData: number[]): BiometricTemplate {
  const templateData = encodeFaceTemplate(faceData);
  
  const enrollment: BiometricEnrollment = enrolledUsers.get(userId) || { userId, status: 'pending' };
  enrollment.faceTemplate = templateData;
  enrollment.status = 'enrolled';
  enrolledUsers.set(userId, enrollment);

  return {
    userId,
    type: 'face',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true
  };
}

export function enrollVoice(userId: string, audioFeatures: number[]): BiometricTemplate {
  const templateData = encodeVoiceTemplate(audioFeatures);
  
  const enrollment: BiometricEnrollment = enrolledUsers.get(userId) || { userId, status: 'pending' };
  enrollment.voiceTemplate = templateData;
  enrollment.status = 'enrolled';
  enrolledUsers.set(userId, enrollment);

  return {
    userId,
    type: 'voice',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true
  };
}

export function enrollFingerprint(userId: string, fingerprintData: number[]): BiometricTemplate {
  const templateData = encodeFingerprintTemplate(fingerprintData);
  
  const enrollment: BiometricEnrollment = enrolledUsers.get(userId) || { userId, status: 'pending' };
  enrollment.fingerprintTemplate = templateData;
  enrollment.status = 'enrolled';
  enrolledUsers.set(userId, enrollment);

  return {
    userId,
    type: 'fingerprint',
    templateData,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    isActive: true
  };
}

export function verifyFace(userId: string, faceData: number[], sessionData?: Record<string, unknown>): BiometricVerificationResult {
  const enrollment = enrolledUsers.get(userId);
  
  if (!enrollment?.faceTemplate) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Face not enrolled' };
  }

  const capturedTemplate = encodeFaceTemplate(faceData);
  const confidence = compareFaceTemplates(enrollment.faceTemplate, capturedTemplate);
  
  let livenessVerified = true;
  if (sessionData) {
    livenessVerified = checkLiveness(sessionData);
  }

  const success = confidence >= 75 && livenessVerified;

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified,
    details: success ? 'Face verified successfully' : `Confidence too low (${Math.round(confidence)}%) or liveness failed`
  };
}

export function verifyVoice(userId: string, audioFeatures: number[]): BiometricVerificationResult {
  const enrollment = enrolledUsers.get(userId);
  
  if (!enrollment?.voiceTemplate) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Voice not enrolled' };
  }

  const capturedTemplate = encodeVoiceTemplate(audioFeatures);
  const confidence = compareVoiceTemplates(enrollment.voiceTemplate, capturedTemplate);
  
  const success = confidence >= 70;

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified: true,
    details: success ? 'Voice verified successfully' : `Confidence too low (${Math.round(confidence)}%)`
  };
}

export function verifyFingerprint(userId: string, fingerprintData: number[]): BiometricVerificationResult {
  const enrollment = enrolledUsers.get(userId);
  
  if (!enrollment?.fingerprintTemplate) {
    return { success: false, confidence: 0, livenessVerified: false, details: 'Fingerprint not enrolled' };
  }

  const capturedTemplate = encodeFingerprintTemplate(fingerprintData);
  const confidence = compareFingerprintTemplates(enrollment.fingerprintTemplate, capturedTemplate);
  
  const success = confidence >= 80;

  return {
    success,
    confidence: Math.round(confidence),
    livenessVerified: true,
    details: success ? 'Fingerprint verified successfully' : `Confidence too low (${Math.round(confidence)}%)`
  };
}

export function getEnrollmentStatus(userId: string): BiometricEnrollment | null {
  return enrolledUsers.get(userId) || null;
}

export function removeBiometricEnrollment(userId: string, type: 'face' | 'voice' | 'fingerprint'): boolean {
  const enrollment = enrolledUsers.get(userId);
  if (!enrollment) return false;

  switch (type) {
    case 'face':
      enrollment.faceTemplate = undefined;
      break;
    case 'voice':
      enrollment.voiceTemplate = undefined;
      break;
    case 'fingerprint':
      enrollment.fingerprintTemplate = undefined;
      break;
  }

  const hasAnyTemplate = enrollment.faceTemplate || enrollment.voiceTemplate || enrollment.fingerprintTemplate;
  if (!hasAnyTemplate) {
    enrolledUsers.delete(userId);
  }

  return true;
}

export function checkRateLimit(userId: string): boolean {
  const attempts = verificationAttempts.get(userId) || { attempts: 0, lastAttempt: '' };
  const now = new Date().getTime();
  const lastAttempt = new Date(attempts.lastAttempt).getTime();
  
  if (now - lastAttempt < 60000) {
    if (attempts.attempts >= 5) return false;
    attempts.attempts++;
  } else {
    attempts.attempts = 1;
  }
  
  attempts.lastAttempt = new Date().toISOString();
  verificationAttempts.set(userId, attempts);
  
  return true;
}

export function getDefaultSettings(): BiometricSettings {
  return {
    enabled: false,
    requiredForAccess: false,
    allowMultipleTypes: true,
    enrolledTypes: [],
    livenessDetection: true
  };
}