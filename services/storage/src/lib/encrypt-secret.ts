import * as crypto from 'crypto';

export function encrypt(valueToEncrypt: string, encryptionKey: string): string {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(12); // Change IV length to 12 bytes
  const cipher = crypto.createCipheriv('aes-256-ccm', keyBuffer, iv, {
    authTagLength: 16,
  });
  let encrypted = cipher.update(valueToEncrypt, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const combined = `${iv.toString('hex')}:${encrypted}:${authTag}`;
  return combined;
}

export function decrypt(valueToDecrypt: string, encryptionKey: string): string {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  const [ivHex, encryptedData] = valueToDecrypt.split(':');
  const ivBuffer = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-ccm', keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
