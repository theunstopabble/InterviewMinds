import { Router } from 'express';
import { createUserKeys, rotateUserKeys, encryptForUser, decryptFromUser, verifyKeyPair, getKeyFingerprint, generateSecureToken } from '../lib/e2eEncryption';

const router = Router();

const keyStore: Map<string, Awaited<ReturnType<typeof createUserKeys>>> = new Map();

interface CreateKeysRequest {
  userId: string;
  password: string;
}

interface EncryptRequest {
  recipientPublicKey: string;
  message: string;
}

interface DecryptRequest {
  ciphertext: string;
  iv: string;
  tag: string;
  encryptedKey: string;
  privateKey: string;
}

interface RotateKeysRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

router.post('/keys/create', async (req, res) => {
  try {
    const body = req.body as CreateKeysRequest;

    if (!body.userId || !body.password) {
      res.status(400).json({ error: 'userId and password are required' });
      return;
    }

    const keys: Awaited<ReturnType<typeof createUserKeys>> = await createUserKeys(body.userId, body.password);
    keyStore.set(body.userId, keys);

    res.json({
      success: true,
      publicKey: keys.publicKey,
      fingerprint: getKeyFingerprint(keys.publicKey)
    });
  } catch (error) {
    console.error('Error creating keys:', error);
    res.status(500).json({ error: 'Failed to create keys' });
  }
});

router.post('/keys/rotate', async (req, res) => {
  try {
    const body = req.body as RotateKeysRequest;

    if (!body.userId || !body.oldPassword || !body.newPassword) {
      res.status(400).json({ error: 'userId, oldPassword, and newPassword are required' });
      return;
    }

    const currentKeys = keyStore.get(body.userId);
    if (!currentKeys) {
      res.status(404).json({ error: 'User keys not found' });
      return;
    }

    const newKeys = await rotateUserKeys(body.userId, body.newPassword, currentKeys.encryptedPrivateKey, body.oldPassword);
    
    if (!newKeys) {
      res.status(401).json({ error: 'Invalid old password' });
      return;
    }

    keyStore.set(body.userId, newKeys);

    res.json({
      success: true,
      newPublicKey: newKeys.publicKey,
      fingerprint: getKeyFingerprint(newKeys.publicKey)
    });
  } catch (error) {
    console.error('Error rotating keys:', error);
    res.status(500).json({ error: 'Failed to rotate keys' });
  }
});

router.get('/keys/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const keys = keyStore.get(userId);

    if (!keys) {
      res.status(404).json({ error: 'User keys not found' });
      return;
    }

    res.json({
      userId: keys.userId,
      publicKey: keys.publicKey,
      fingerprint: getKeyFingerprint(keys.publicKey),
      createdAt: keys.createdAt
    });
  } catch (error) {
    console.error('Error fetching keys:', error);
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

router.post('/encrypt', async (req, res) => {
  try {
    const body = req.body as EncryptRequest;

    if (!body.recipientPublicKey || !body.message) {
      res.status(400).json({ error: 'recipientPublicKey and message are required' });
      return;
    }

    const encrypted = encryptForUser(body.message, body.recipientPublicKey);

    if (!encrypted) {
      res.status(500).json({ error: 'Encryption failed' });
      return;
    }

    res.json(encrypted);
  } catch (error) {
    console.error('Error encrypting:', error);
    res.status(500).json({ error: 'Failed to encrypt message' });
  }
});

router.post('/decrypt', async (req, res) => {
  try {
    const body = req.body as DecryptRequest;

    if (!body.ciphertext || !body.iv || !body.tag || !body.encryptedKey || !body.privateKey) {
      res.status(400).json({ error: 'All decryption parameters are required' });
      return;
    }

    const decrypted = decryptFromUser({
      ciphertext: body.ciphertext,
      iv: body.iv,
      tag: body.tag,
      encryptedKey: body.encryptedKey
    }, body.privateKey);

    if (!decrypted) {
      res.status(401).json({ error: 'Decryption failed - invalid key or corrupted data' });
      return;
    }

    res.json({ message: decrypted });
  } catch (error) {
    console.error('Error decrypting:', error);
    res.status(500).json({ error: 'Failed to decrypt message' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { publicKey, privateKey } = req.body;

    if (!publicKey || !privateKey) {
      res.status(400).json({ error: 'publicKey and privateKey are required' });
      return;
    }

    const isValid = verifyKeyPair(publicKey, privateKey);

    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying keys:', error);
    res.status(500).json({ error: 'Failed to verify keys' });
  }
});

router.get('/token/generate', async (req, res) => {
  try {
    const token = generateSecureToken(32);
    res.json({ token, expiresIn: 3600 });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;