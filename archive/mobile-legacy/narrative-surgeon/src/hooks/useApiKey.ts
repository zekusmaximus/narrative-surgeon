import { useState, useEffect, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';
import { llmProvider } from '../services/llmProvider';
import ApiValidationService, { ValidationResult } from '../services/apiValidation';

interface UseApiKeyResult {
  hasApiKey: boolean;
  isLoading: boolean;
  isValidating: boolean;
  validationResult: ValidationResult | null;
  saveApiKey: (key: string) => Promise<boolean>;
  removeApiKey: () => Promise<boolean>;
  validateApiKey: (key: string) => Promise<ValidationResult>;
  checkApiKey: () => Promise<void>;
}

// Shared encryption key management with fallback
let encryptionKeyPromise: Promise<string> | null = null;

const getOrCreateEncryptionKey = async (): Promise<string> => {
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = (async () => {
      try {
        // Try to use Expo SecureStore if available
        const SecureStore = require('expo-secure-store');
        const Crypto = require('expo-crypto');
        
        let key = await SecureStore.getItemAsync('encryption_key');
        if (!key) {
          key = Crypto.randomUUID();
          await SecureStore.setItemAsync('encryption_key', key);
        }
        return key;
      } catch (error) {
        // Fallback to static key if Expo modules not available
        return 'narrative-surgeon-encryption-key-v2';
      }
    })();
  }
  return encryptionKeyPromise;
};

let secureStorage: MMKV | null = null;

const getSecureStorage = async (): Promise<MMKV> => {
  if (!secureStorage) {
    const encryptionKey = await getOrCreateEncryptionKey();
    secureStorage = new MMKV({
      id: 'narrative-surgeon-secure',
      encryptionKey
    });
  }
  return secureStorage;
};

export const useApiKey = (): UseApiKeyResult => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const checkApiKey = useCallback(async () => {
    try {
      setIsLoading(true);
      const storage = await getSecureStorage();
      const existingKey = storage.getString('openai_api_key');
      setHasApiKey(!!existingKey);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateApiKey = useCallback(async (key: string): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const result = await ApiValidationService.validateApiKey(key);
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const saveApiKey = useCallback(async (key: string): Promise<boolean> => {
    try {
      setIsValidating(true);
      
      // Format validation first
      const formatCheck = ApiValidationService.validateApiKeyFormat(key);
      if (!formatCheck.isValid) {
        setValidationResult({ isValid: false, error: formatCheck.error });
        return false;
      }

      // Network validation
      const validationResult = await ApiValidationService.validateApiKey(key);
      setValidationResult(validationResult);
      
      if (!validationResult.isValid) {
        return false;
      }

      // Save using the LLM provider's enhanced method
      await llmProvider.setApiKey(key);
      setHasApiKey(true);
      
      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      setValidationResult({ 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Failed to save API key' 
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const removeApiKey = useCallback(async (): Promise<boolean> => {
    try {
      const storage = await getSecureStorage();
      storage.delete('openai_api_key');
      setHasApiKey(false);
      setValidationResult(null);
      return true;
    } catch (error) {
      console.error('Error removing API key:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  return {
    hasApiKey,
    isLoading,
    isValidating,
    validationResult,
    saveApiKey,
    removeApiKey,
    validateApiKey,
    checkApiKey
  };
};

// Additional utility hook for API key status across the app
export const useApiKeyStatus = () => {
  const [hasValidKey, setHasValidKey] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const storage = await getSecureStorage();
      const existingKey = storage.getString('openai_api_key');
      setHasValidKey(!!existingKey);
    } catch {
      setHasValidKey(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { hasValidKey, isChecking, refreshStatus: checkStatus };
};

export default useApiKey;