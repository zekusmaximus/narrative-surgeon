/**
 * API Key Validation Service
 * Provides secure validation of OpenAI API keys
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  models?: string[];
  rateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

export class ApiValidationService {
  private static readonly TIMEOUT_MS = 10000; // 10 seconds
  private static readonly OPENAI_MODELS_ENDPOINT = 'https://api.openai.com/v1/models';
  
  /**
   * Validates an OpenAI API key by making a test request
   */
  static async validateApiKey(apiKey: string): Promise<ValidationResult> {
    // Basic format validation
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'API key is required'
      };
    }

    const trimmedKey = apiKey.trim();
    
    // Check basic format
    if (!trimmedKey.startsWith('sk-')) {
      return {
        isValid: false,
        error: 'OpenAI API keys must start with "sk-"'
      };
    }

    // Check reasonable length (OpenAI keys are typically 51 characters)
    if (trimmedKey.length < 20) {
      return {
        isValid: false,
        error: 'API key appears to be too short'
      };
    }

    try {
      // Test the API key by fetching available models
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(this.OPENAI_MODELS_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trimmedKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'narrative-surgeon/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Invalid API key';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Use default error message if can't parse
        }

        return {
          isValid: false,
          error: `API validation failed: ${errorMessage}`
        };
      }

      // Parse successful response
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        return {
          isValid: false,
          error: 'API key validation failed: No models available'
        };
      }

      // Extract available models
      const models = data.data
        .map((model: any) => model.id)
        .filter((id: string) => id && typeof id === 'string')
        .sort();

      // Check for expected OpenAI models
      const hasExpectedModels = models.some((model: string) => 
        model.startsWith('gpt-') || model.includes('text-') || model.includes('davinci')
      );

      if (!hasExpectedModels) {
        return {
          isValid: false,
          error: 'API key validation failed: No OpenAI models found'
        };
      }

      // Extract rate limit info from headers if available
      const rateLimits: ValidationResult['rateLimits'] = {};
      const requestsPerMinute = response.headers.get('x-ratelimit-limit-requests');
      const tokensPerMinute = response.headers.get('x-ratelimit-limit-tokens');
      
      if (requestsPerMinute) {
        rateLimits.requestsPerMinute = parseInt(requestsPerMinute);
      }
      if (tokensPerMinute) {
        rateLimits.tokensPerMinute = parseInt(tokensPerMinute);
      }

      return {
        isValid: true,
        models: models,
        rateLimits: Object.keys(rateLimits).length > 0 ? rateLimits : undefined
      };

    } catch (error) {
      let errorMessage = 'Network error during validation';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Validation timed out - check your internet connection';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - check your internet connection';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        isValid: false,
        error: errorMessage
      };
    }
  }

  /**
   * Quick format validation without network request
   */
  static validateApiKeyFormat(apiKey: string): { isValid: boolean; error?: string } {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is required' };
    }

    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey.startsWith('sk-')) {
      return { isValid: false, error: 'OpenAI API keys must start with "sk-"' };
    }

    if (trimmedKey.length < 20) {
      return { isValid: false, error: 'API key appears to be too short' };
    }

    if (trimmedKey.length > 200) {
      return { isValid: false, error: 'API key appears to be too long' };
    }

    // Check for suspicious characters
    if (!/^sk-[A-Za-z0-9\-_]+$/.test(trimmedKey)) {
      return { isValid: false, error: 'API key contains invalid characters' };
    }

    return { isValid: true };
  }

  /**
   * Get model capabilities and pricing tier estimation
   */
  static getModelInfo(modelId: string) {
    const modelInfo: Record<string, {
      name: string;
      tier: 'free' | 'paid' | 'premium';
      description: string;
      maxTokens: number;
      contextWindow: number;
    }> = {
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        tier: 'free',
        description: 'Fast and efficient for most tasks',
        maxTokens: 4096,
        contextWindow: 128000
      },
      'gpt-4o': {
        name: 'GPT-4o',
        tier: 'paid',
        description: 'Balanced performance and capabilities',
        maxTokens: 4096,
        contextWindow: 128000
      },
      'gpt-4': {
        name: 'GPT-4',
        tier: 'premium',
        description: 'Most capable, best for complex analysis',
        maxTokens: 8192,
        contextWindow: 8192
      },
      'gpt-4-32k': {
        name: 'GPT-4 32K',
        tier: 'premium',
        description: 'Extended context for long documents',
        maxTokens: 32768,
        contextWindow: 32768
      }
    };

    return modelInfo[modelId] || {
      name: modelId,
      tier: 'paid' as const,
      description: 'OpenAI model',
      maxTokens: 4096,
      contextWindow: 4096
    };
  }

  /**
   * Estimate API costs for manuscript analysis
   */
  static estimateCosts(manuscriptWordCount: number, model: string = 'gpt-4o-mini') {
    // Rough estimation based on typical usage patterns
    const wordsPerToken = 0.75; // Average for English
    const tokensPerWord = 1 / wordsPerToken;
    
    const estimatedInputTokens = manuscriptWordCount * tokensPerWord;
    const estimatedOutputTokens = estimatedInputTokens * 0.3; // Assume 30% output ratio
    
    // Pricing per 1M tokens (approximate, as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4o': { input: 5.00, output: 15.00 },
      'gpt-4': { input: 30.00, output: 60.00 }
    };
    
    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    
    const inputCost = (estimatedInputTokens / 1000000) * modelPricing.input;
    const outputCost = (estimatedOutputTokens / 1000000) * modelPricing.output;
    const totalCost = inputCost + outputCost;
    
    return {
      estimatedInputTokens: Math.round(estimatedInputTokens),
      estimatedOutputTokens: Math.round(estimatedOutputTokens),
      estimatedCostUSD: Math.round(totalCost * 100) / 100, // Round to cents
      priceBreakdown: {
        inputCostUSD: Math.round(inputCost * 100) / 100,
        outputCostUSD: Math.round(outputCost * 100) / 100
      }
    };
  }
}

export default ApiValidationService;