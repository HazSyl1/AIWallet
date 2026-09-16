// Secure Storage Service using Expo SecureStore
// Wraps iOS Keychain and Android Keystore (Section 5.1, 5.3)

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Check if SecureStore is available (not on web)
const isSecureStoreAvailable = Platform.OS !== 'web';

// In-memory fallback for web (NOT SECURE - for development only)
const webFallbackStorage: Record<string, string> = {};

// Keys for secure storage
export const SECURE_KEYS = {
  DB_ENCRYPTION_KEY: 'ai_wallet_db_key',
  OPENAI_API_KEY: 'ai_wallet_openai_key',
  ANTHROPIC_API_KEY: 'ai_wallet_anthropic_key',
} as const;

type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];

/**
 * SecureStorageService - manages secrets using OS secure storage
 *
 * Per spec Section 5.1:
 * - Encryption keys must use iOS Keychain / Android Keystore
 * - API keys stored ONLY in OS secure storage
 * - Never in database, logs, exports, or screenshots
 */
class SecureStorageService {
  /**
   * Store a value securely
   */
  async setItem(key: SecureKey, value: string): Promise<void> {
    if (!isSecureStoreAvailable) {
      // Web fallback (not secure - for dev only)
      webFallbackStorage[key] = value;
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value, {
        // Require device authentication (PIN/biometric) to access
        requireAuthentication: false, // Set to true for extra security
        // Only accessible when device is unlocked
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error(`SecureStore: Failed to set ${key}:`, error);
      throw new Error(`Failed to store secure value: ${key}`);
    }
  }

  /**
   * Retrieve a value from secure storage
   */
  async getItem(key: SecureKey): Promise<string | null> {
    if (!isSecureStoreAvailable) {
      // Web fallback
      return webFallbackStorage[key] || null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`SecureStore: Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from secure storage
   */
  async deleteItem(key: SecureKey): Promise<void> {
    if (!isSecureStoreAvailable) {
      // Web fallback
      delete webFallbackStorage[key];
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`SecureStore: Failed to delete ${key}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async hasItem(key: SecureKey): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  // ============ Database Encryption Key ============

  /**
   * Get or create the database encryption key
   * This key is generated once and stored forever
   */
  async getOrCreateDBKey(): Promise<string> {
    let key = await this.getItem(SECURE_KEYS.DB_ENCRYPTION_KEY);

    if (!key) {
      // Generate a new 256-bit key (32 bytes as hex = 64 chars)
      key = await this.generateSecureKey(32);
      await this.setItem(SECURE_KEYS.DB_ENCRYPTION_KEY, key);
      console.log('SecureStore: Generated new database encryption key');
    }

    return key;
  }

  /**
   * Generate a cryptographically secure random key
   */
  private async generateSecureKey(bytes: number): Promise<string> {
    const array = await Crypto.getRandomBytesAsync(bytes);

    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ============ BYOK API Keys ============

  /**
   * Store OpenAI API key
   */
  async setOpenAIKey(key: string): Promise<void> {
    await this.setItem(SECURE_KEYS.OPENAI_API_KEY, key);
  }

  /**
   * Get OpenAI API key
   */
  async getOpenAIKey(): Promise<string | null> {
    return this.getItem(SECURE_KEYS.OPENAI_API_KEY);
  }

  /**
   * Delete OpenAI API key
   */
  async deleteOpenAIKey(): Promise<void> {
    await this.deleteItem(SECURE_KEYS.OPENAI_API_KEY);
  }

  /**
   * Store Anthropic API key
   */
  async setAnthropicKey(key: string): Promise<void> {
    await this.setItem(SECURE_KEYS.ANTHROPIC_API_KEY, key);
  }

  /**
   * Get Anthropic API key
   */
  async getAnthropicKey(): Promise<string | null> {
    return this.getItem(SECURE_KEYS.ANTHROPIC_API_KEY);
  }

  /**
   * Delete Anthropic API key
   */
  async deleteAnthropicKey(): Promise<void> {
    await this.deleteItem(SECURE_KEYS.ANTHROPIC_API_KEY);
  }

  /**
   * Check if any BYOK key is configured
   */
  async hasBYOKKey(): Promise<{ openai: boolean; anthropic: boolean }> {
    const [openai, anthropic] = await Promise.all([
      this.hasItem(SECURE_KEYS.OPENAI_API_KEY),
      this.hasItem(SECURE_KEYS.ANTHROPIC_API_KEY),
    ]);
    return { openai, anthropic };
  }

  /**
   * Delete all BYOK keys
   */
  async clearAllBYOKKeys(): Promise<void> {
    await Promise.all([this.deleteOpenAIKey(), this.deleteAnthropicKey()]);
  }

  /**
   * Delete ALL secure data (for account reset)
   * WARNING: This will require re-setup of the app
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.deleteItem(SECURE_KEYS.DB_ENCRYPTION_KEY),
      this.deleteItem(SECURE_KEYS.OPENAI_API_KEY),
      this.deleteItem(SECURE_KEYS.ANTHROPIC_API_KEY),
    ]);
    console.log('SecureStore: All secure data cleared');
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();
