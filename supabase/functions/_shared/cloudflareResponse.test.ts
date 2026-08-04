import { describe, expect, it } from 'vitest';

import { extractCloudflareText } from './cloudflareResponse';

describe('extractCloudflareText', () => {
  it.each([
    [{ result: { response: 'Envelope response' } }, 'Envelope response'],
    [{ result: { choices: [{ message: { content: 'Nested choice' } }] } }, 'Nested choice'],
    [{ choices: [{ message: { content: 'Top-level choice' } }] }, 'Top-level choice'],
    [{ result: { choices: [{ text: 'Choice text' }] } }, 'Choice text'],
    [{ result: { content: [{ type: 'text', text: 'Content block' }] } }, 'Content block'],
    [{ result: { output: [{ content: [{ text: 'Output block' }] }] } }, 'Output block'],
  ])('extracts a supported Cloudflare response shape', (payload, expected) => {
    expect(extractCloudflareText(payload)).toBe(expected);
  });

  it('does not expose unrelated metadata as an answer', () => {
    expect(extractCloudflareText({ success: true, result: { model: 'example' } })).toBe('');
  });
});
