import * as crypto from 'crypto';

// NOTE: Encryption key must be 32 bytes long & Initialization vector must be 16 bytes long
export function encrypt(
  valueToEncrypt: string,
  encryptionKey: string,
  initializationVector: string,
): string {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey),
    Buffer.from(initializationVector),
  );
  let crypted = cipher.update(valueToEncrypt, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

export function decrypt(
  valueToEncrypt: string,
  encryptionKey: string,
  initializationVector: string,
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey),
    Buffer.from(initializationVector),
  );
  let dec = decipher.update(valueToEncrypt, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
