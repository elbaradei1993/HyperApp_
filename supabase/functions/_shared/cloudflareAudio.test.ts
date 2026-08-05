/* global Response, btoa */
import { describe, expect, it } from 'vitest';

import { detectAudioMimeType, extractCloudflareAudio } from './cloudflareAudio';

const WAV_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
]);

describe('Cloudflare audio extraction', () => {
  it('decodes the MeloTTS JSON base64 WAV envelope', async () => {
    const encoded = btoa(String.fromCharCode(...WAV_BYTES));
    const response = new Response(JSON.stringify({ result: { audio: encoded } }), {
      headers: { 'content-type': 'application/json' },
    });

    const result = await extractCloudflareAudio(response);

    expect(result?.mimeType).toBe('audio/wav');
    expect(Array.from(result?.bytes || [])).toEqual(Array.from(WAV_BYTES));
  });

  it('accepts raw MP3 bytes and detects both common MP3 signatures', async () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]);
    const response = new Response(bytes, { headers: { 'content-type': 'audio/mpeg' } });

    expect((await extractCloudflareAudio(response))?.mimeType).toBe('audio/mpeg');
    expect(detectAudioMimeType(new Uint8Array([0xff, 0xfb, 0x90, 0x64]))).toBe('audio/mpeg');
  });

  it('rejects malformed or unsupported provider payloads', async () => {
    const invalidJson = new Response(JSON.stringify({ result: { audio: 'not audio' } }), {
      headers: { 'content-type': 'application/json' },
    });
    const unknownBytes = new Response(new Uint8Array([1, 2, 3]));

    expect(await extractCloudflareAudio(invalidJson)).toBeNull();
    expect(await extractCloudflareAudio(unknownBytes)).toBeNull();
  });
});
