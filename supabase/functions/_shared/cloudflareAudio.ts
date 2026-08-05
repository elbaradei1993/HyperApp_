/* global Response, atob */
export type CloudflareAudioMimeType = 'audio/mpeg' | 'audio/wav';

export interface CloudflareAudio {
  bytes: Uint8Array;
  mimeType: CloudflareAudioMimeType;
}

interface CloudflareAudioEnvelope {
  result?: {
    audio?: unknown;
  };
}

export function detectAudioMimeType(bytes: Uint8Array): CloudflareAudioMimeType | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return 'audio/wav';
  }

  if (
    bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33
  ) {
    return 'audio/mpeg';
  }

  if (
    bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
  ) {
    return 'audio/mpeg';
  }

  return null;
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/^data:audio\/[\w.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!normalized || normalized.length % 4 === 1) {
      return null;
    }
    const decoded = atob(normalized);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function extractCloudflareAudio(response: Response): Promise<CloudflareAudio | null> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null) as CloudflareAudioEnvelope | null;
    const encodedAudio = payload?.result?.audio;
    if (typeof encodedAudio !== 'string') {
      return null;
    }
    const bytes = decodeBase64(encodedAudio);
    const mimeType = bytes ? detectAudioMimeType(bytes) : null;
    return bytes && bytes.byteLength > 0 && mimeType ? { bytes, mimeType } : null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const mimeType = detectAudioMimeType(bytes);
  return bytes.byteLength > 0 && mimeType ? { bytes, mimeType } : null;
}
