import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const VERSION = 'v1';

export class EncryptionService {
    private static getKey(): Buffer {
        const keyStr = process.env.ENCRYPTION_KEY;
        if (!keyStr) {
            throw new Error('ENCRYPTION_KEY is not defined in environment variables');
        }
        const key = Buffer.from(keyStr, 'hex');
        if (key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
        }
        return key;
    }

    static encrypt(text: string): string {
        if (!text) return text;
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = this.getKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    static decrypt(encryptedText: string): string {
        if (!encryptedText) return encryptedText;
        if (!encryptedText.startsWith(`${VERSION}:`)) return encryptedText;

        try {
            const [version, ivHex, authTagHex, ciphertextHex] = encryptedText.split(':');
            const key = this.getKey();
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[DECRYPTION_FAILED]';
        }
    }

    static encryptJson(data: any): string {
        if (!data) return data;
        return this.encrypt(JSON.stringify(data));
    }

    static decryptJson(encryptedData: string): any {
        if (!encryptedData) return encryptedData;
        const decryptedString = this.decrypt(encryptedData);
        try {
            return JSON.parse(decryptedString);
        } catch (e) {
            return decryptedString;
        }
    }

    static generateBlindIndex(text: string): string {
        if (!text) return text;
        const key = this.getKey();
        return crypto
            .createHmac('sha256', key)
            .update(text.toLowerCase())
            .digest('hex');
    }
}
