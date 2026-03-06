/**
 * Translation Service using LibreTranslate (free, open-source)
 * No API key required - uses public instances
 */

interface TranslationRequest {
  q: string;        // Text to translate
  source: string;   // Source language (auto-detect if empty)
  target: string;   // Target language
  format?: string;  // Format: 'text' or 'html'
}

interface TranslationResponse {
  translatedText: string;
}

class TranslationService {
  // Multiple LibreTranslate public instances for reliability
  // Note: Public instances are often rate-limited or unreliable
  private readonly LIBRETRANSLATE_INSTANCES = [
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate',
    'https://libretranslate.de/translate',
  ];

  // Request tracking to prevent overwhelming services
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  private cache: Map<string, { translation: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for translations

  /**
   * Translate text from English to Arabic
   */
  async translateToArabic(text: string): Promise<string> {
    if (!text || text.trim() === '') {
      return text;
    }

    // Check cache first
    const cacheKey = `en-ar-${text}`;
    const cached = this.getCachedTranslation(cacheKey);
    if (cached) {
      console.log('Using cached Arabic translation');
      return cached;
    }

    try {
      console.log('Translating to Arabic:', text.substring(0, 50) + '...');

      const translation = await this.translateText(text, 'en', 'ar');
      console.log('Translation successful');

      // Cache the result
      this.setCachedTranslation(cacheKey, translation);

      return translation;
    } catch (error) {
      console.warn('Translation failed, returning original text:', error);
      return text; // Return original text if translation fails
    }
  }

  /**
   * Translate text between any languages with improved error handling
   */
  private async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next translation request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    const requestData: TranslationRequest = {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    };

    // Try each LibreTranslate instance with timeout and better error handling
    for (const instanceUrl of this.LIBRETRANSLATE_INSTANCES) {
      try {
        console.log(`Trying LibreTranslate instance: ${instanceUrl}`);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(instanceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const statusText = response.statusText || 'Unknown error';
          console.warn(`Instance ${instanceUrl} returned ${response.status}: ${statusText}`);

          // Special handling for rate limits
          if (response.status === 429) {
            console.warn('Rate limited, skipping this instance');
            continue;
          }

          // For other errors, try next instance
          continue;
        }

        const data: TranslationResponse = await response.json();

        if (data.translatedText && data.translatedText.trim()) {
          console.log(`✅ Translation successful from ${instanceUrl}`);
          return data.translatedText.trim();
        } else {
          console.warn(`Instance ${instanceUrl} returned empty translation`);
          continue;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Instance ${instanceUrl} failed: ${errorMessage}`);

        // Handle specific error types
        if (errorMessage.includes('CORS')) {
          console.warn('CORS error - this instance blocks browser requests');
        } else if (errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
          console.warn('DNS resolution failed - instance domain may not exist');
        } else if (errorMessage.includes('AbortError')) {
          console.warn('Request timed out');
        }

        continue; // Try next instance
      }
    }

    // All instances failed - throw error to trigger fallback behavior
    throw new Error('All LibreTranslate instances failed or are unavailable');
  }

  /**
   * Get cached translation if still valid
   */
  private getCachedTranslation(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.translation;
    }
    return null;
  }

  /**
   * Set cached translation
   */
  private setCachedTranslation(key: string, translation: string): void {
    this.cache.set(key, {
      translation,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Check if text is already in Arabic
   */
  isArabicText(text: string): boolean {
    // Check if text contains Arabic characters
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) || false;
  }

  /**
   * Generic translate method (for compatibility with i18n.ts)
   */
  async translate(text: string, sourceLang: 'en' | 'ar', targetLang: 'en' | 'ar'): Promise<string> {
    if (sourceLang === 'en' && targetLang === 'ar') {
      return this.translateToArabic(text);
    } else if (sourceLang === 'ar' && targetLang === 'en') {
      // For Arabic to English, we'd need a different method
      // For now, return original text
      return text;
    } else {
      // Same language
      return text;
    }
  }
}

// Export singleton instance
export const translationService = new TranslationService();
export type { TranslationRequest, TranslationResponse };
