import Bytez from 'bytez.js';

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

class TranscriptionService {
  private bytezSdk: any;
  private model: any;

  constructor() {
    // Lazy initialization to avoid errors when API key is missing
    const apiKey = import.meta.env.VITE_BYTEZ_API_KEY;
    if (apiKey) {
      try {
        this.bytezSdk = new Bytez(apiKey);
        this.model = this.bytezSdk.model('openai/whisper-large-v3');
      } catch (error) {
        console.warn('Failed to initialize Bytez SDK:', error);
      }
    }
  }

  /**
   * Transcribe audio file to text
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      if (!this.model) {
        throw new Error('Transcription service not initialized. Please check your Bytez API key.');
      }

      // Convert blob to base64 for API
      const base64Audio = await this.blobToBase64(audioBlob);

      // Call Whisper API
      const { error, output } = await this.model.run(base64Audio);

      if (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
      }

      // Extract transcription from output
      const transcription = this.extractTranscription(output);

      return {
        text: transcription,
        confidence: output?.confidence || 0.8,
        language: output?.language || 'en',
      };
    } catch (error) {
      console.error('Transcription service error:', error);
      throw error;
    }
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Extract transcription text from API response
   */
  private extractTranscription(output: any): string {
    if (!output) {
      return '';
    }

    // Handle different response formats
    if (typeof output === 'string') {
      return output;
    }

    if (output.text) {
      return output.text;
    }

    if (output.transcription) {
      return output.transcription;
    }

    if (output.transcript) {
      return output.transcript;
    }

    // Fallback: try to find text in nested object
    if (typeof output === 'object') {
      const textKeys = ['text', 'transcription', 'transcript', 'result'];
      for (const key of textKeys) {
        if (output[key] && typeof output[key] === 'string') {
          return output[key];
        }
      }
    }

    return '';
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.model;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg'];
  }

  /**
   * Validate audio file
   */
  validateAudioFile(file: File): { valid: boolean; error?: string } {
    const supportedFormats = this.getSupportedFormats();
    const maxSize = 25 * 1024 * 1024; // 25MB limit for Whisper

    if (!supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported audio format. Supported formats: ${supportedFormats.join(', ')}`,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Audio file too large. Maximum size: 25MB',
      };
    }

    if (file.size < 1000) { // 1KB minimum
      return {
        valid: false,
        error: 'Audio file too small or empty',
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;
