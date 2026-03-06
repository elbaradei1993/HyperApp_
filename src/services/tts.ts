interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

// Simple TTS Service using Web Speech API
class TTSService {
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private readonly safetyVoice = 'default'; // Use default system voice

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const { voice = this.safetyVoice, speed = 1.0, pitch = 1.0, volume = 1.0 } = options;

    return new Promise((resolve, reject) => {
      // Stop any ongoing speech
      this.stop();

      try {
        // Validate text
        if (!text || !text.trim()) {
          resolve();
          return;
        }

        // Check if Web Speech API is available
        if (!this.speechSynthesis) {
          throw new Error('Web Speech API not available');
        }

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        // Configure voice settings
        utterance.rate = Math.max(0.1, Math.min(10, speed)); // Clamp between 0.1 and 10
        utterance.pitch = Math.max(0, Math.min(2, pitch)); // Clamp between 0 and 2
        utterance.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1

        // Try to find a suitable voice
        const voices = this.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Look for English voices first
          const englishVoice = voices.find(v => v.lang.startsWith('en'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          } else {
            // Fallback to first available voice
            utterance.voice = voices[0];
          }
        }

        // Handle speech events
        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Web Speech API error:', event.error);
          this.currentUtterance = null;
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        // Start speech
        this.speechSynthesis.speak(utterance);

      } catch (error) {
        console.error('TTS error:', error);
        this.currentUtterance = null;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isReady(): boolean {
    return !!this.speechSynthesis;
  }

  getAvailableVoices(): string[] {
    if (!this.speechSynthesis) {
      return [];
    }

    const voices = this.speechSynthesis.getVoices();
    return voices.map(voice => voice.name || voice.lang);
  }

  getSafetyVoice(): string {
    return this.safetyVoice;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
