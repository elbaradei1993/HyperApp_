const CONTENT_KEYS = [
  'content',
  'text',
  'response',
  'answer',
  'output',
  'output_text',
  'message',
  'choices',
  'result',
] as const;

function findText(value: unknown, depth = 0): string {
  if (depth > 6 || value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => findText(item, depth + 1)).filter(Boolean).join('\n').trim();
  }
  if (typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  for (const key of CONTENT_KEYS) {
    if (key in record) {
      const text = findText(record[key], depth + 1);
      if (text) {
        return text;
      }
    }
  }
  return '';
}

export function extractCloudflareText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  const record = payload as Record<string, unknown>;

  // The REST API normally wraps model output in `result`, while newer chat
  // models can return an OpenAI-compatible `choices` array at the top level.
  return findText(record.result) || findText(record.choices) || findText(record.response);
}
