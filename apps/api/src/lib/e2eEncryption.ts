interface KeyPair {
  publicKey: string;
  privateKey: string;
}

interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  tag: string;
  encryptedKey?: string;
}

interface E2EKeyManager {
  userId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: string;
  updatedAt: string;
}

function generateKeyPair(): Promise<KeyPair> {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      resolve({ publicKey, privateKey });
    } catch (error) {
      reject(error);
    }
  });
}

function encryptWithPassword(privateKey: string, password: string): string {
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${salt}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptWithPassword(encryptedPrivateKey: string, password: string): string | null {
  try {
    const crypto = require('crypto');
    const [salt, ivHex, tagHex, encrypted] = encryptedPrivateKey.split(':');
    
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    return null;
  }
}

function encryptMessage(message: string, publicKey: string): EncryptedMessage | null {
  try {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(12);
    const key = crypto.randomBytes(32);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    
    const encryptedKey = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      key
    ).toString('hex');
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag,
      encryptedKey
    };
  } catch {
    return null;
  }
}

function decryptMessage(encryptedData: EncryptedMessage, privateKey: string): string | null {
  try {
    const crypto = require('crypto');
    
    const encryptedKey = encryptedData.encryptedKey;
    if (!encryptedKey) return null;
    
    const key = crypto.privateDecrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(encryptedKey, 'hex')
    );
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    return null;
  }
}

function hashData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

export async function createUserKeys(userId: string, password: string): Promise<E2EKeyManager> {
  const { publicKey, privateKey } = await generateKeyPair();
  const encryptedPrivateKey = encryptWithPassword(privateKey, password);
  
  return {
    userId,
    publicKey,
    encryptedPrivateKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function rotateUserKeys(userId: string, newPassword: string, oldEncryptedPrivateKey: string, oldPassword: string): Promise<E2EKeyManager | null> {
  const oldPrivateKey = decryptWithPassword(oldEncryptedPrivateKey, oldPassword);
  if (!oldPrivateKey) return null;
  
  const oldPublicKey = oldPrivateKey.includes('-----BEGIN') ? 
    require('crypto').createPublicKey(oldPrivateKey).export({ type: 'spki', format: 'pem' }) : null;
  
  if (!oldPublicKey) return null;
  
  return createUserKeys(userId, newPassword);
}

export function encryptForUser(message: string, recipientPublicKey: string): EncryptedMessage | null {
  return encryptMessage(message, recipientPublicKey);
}

export function decryptFromUser(encryptedData: EncryptedMessage, privateKey: string): string | null {
  return decryptMessage(encryptedData, privateKey);
}

export function storeEncryptedKey(encryptedPrivateKey: string, userId: string): string {
  return hashData(`${userId}:${encryptedPrivateKey}`);
}

export function verifyKeyPair(publicKey: string, privateKey: string): boolean {
  try {
    const crypto = require('crypto');
    const testMessage = 'verification-test-message';
    const testEncrypted = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(testMessage));
    const decrypted = crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, testEncrypted);
    return decrypted.toString() === testMessage;
  } catch {
    return false;
  }
}

export function getKeyFingerprint(publicKey: string): string {
  return hashData(publicKey).slice(0, 16);
}

export { generateSecureToken, hashData };