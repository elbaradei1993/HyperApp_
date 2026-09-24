import { supabase } from '../lib/supabase';

interface SpeechFunctionResponse {
  transcript?: string;
  error?: string;
}

const TRANSCRIPTION_TIMEOUT_MS = 20_000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function publicError(status: number, fallback?: string): Error {
  if (status === 401) return new Error('Your session expired. Sign in again to continue voice input.');
  if (status === 413) return new Error('That voice recording was too large. Please try again with a shorter message.');
  if (status === 429) return new Error('Voice input is receiving too many requests. Wait a moment and try again.');
  if (status === 503) return new Error('Hosted voice input is temporarily unavailable. Try again shortly.');
  if (status === 504) return new Error('Voice transcription took too long. Please try again.');
  return new Error(fallback || 'Voice transcription could not be completed. Please try again.');
}

export async function transcribeVoiceAudio(
  audio: Blob,
  language = 'en',
): Promise<string> {
  if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
    throw publicError(413);
  }

  const formData = new FormData();
  formData.append('audio', audio, 'hyper-voice.webm');
  formData.append('language', language.slice(0, 20));

  const invocation = supabase.functions.invoke<SpeechFunctionResponse>('hyper-stt', {
    body: formData,
  });
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('Voice transcription took too long. Please try again.')), TRANSCRIPTION_TIMEOUT_MS);
  });

  try {
    const { data, error } = await Promise.race([invocation, timeout]);
    if (error) {
      const context = error as Error & { context?: { response?: Response } };
      const status = context.context?.response?.status || 502;
      throw publicError(status, error.message);
    }
    const transcript = data?.transcript?.replace(/\s+/g, ' ').trim();
    if (!transcript) {
      throw new Error('I could not hear a clear message. Please try again.');
    }
    return transcript.slice(0, 1500);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Voice transcription')) throw error;
    throw error instanceof Error ? error : new Error('Voice transcription could not be completed. Please try again.');
  }
}
