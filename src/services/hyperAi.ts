import { supabase } from '../lib/supabase';
import type { Report } from '../types';

export type HyperAiRole = 'user' | 'assistant';

export interface HyperAiMessage {
  id: string;
  role: HyperAiRole;
  content: string;
  createdAt: string;
}

export interface HyperAiReportContext {
  hasLocation: boolean;
  totalNearby: number;
  recent24Hours: number;
  attentionSignals: number;
  positiveSignals: number;
  reportTypes: Record<string, number>;
  recentSignals: Array<{
    type: string;
    emergency: boolean;
    ageMinutes: number;
    location?: string;
    note?: string;
    communityScore: number;
  }>;
}

interface HyperAiFunctionResponse {
  answer?: string;
  model?: string;
  error?: string;
}

interface FunctionInvokeError extends Error {
  context?: {
    clone: () => { json: () => Promise<unknown> };
  };
}

const MAX_HISTORY_MESSAGES = 8;
const MAX_REPORT_SIGNALS = 8;
const REQUEST_TIMEOUT_MS = 30000;

export function createHyperAiMessage(role: HyperAiRole, content: string): HyperAiMessage {
  return {
    id: typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function buildHyperAiReportContext(
  reports: Report[],
  hasLocation: boolean,
): HyperAiReportContext {
  const now = Date.now();
  const recentCutoff = now - (24 * 60 * 60 * 1000);
  const recentReports = reports.filter((report) => {
    const createdAt = new Date(report.created_at).getTime();
    return Number.isFinite(createdAt) && createdAt >= recentCutoff;
  });

  const isAttentionSignal = (report: Report) => (
    report.emergency || ['dangerous', 'suspicious'].includes(String(report.vibe_type))
  );
  const isPositiveSignal = (report: Report) => (
    ['safe', 'calm', 'quiet'].includes(String(report.vibe_type))
  );

  const reportTypes = recentReports.reduce<Record<string, number>>((counts, report) => {
    const type = String(report.vibe_type || 'other');
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const recentSignals = [...recentReports]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, MAX_REPORT_SIGNALS)
    .map((report) => ({
      type: String(report.vibe_type || 'other'),
      emergency: Boolean(report.emergency),
      ageMinutes: Math.max(0, Math.round((now - new Date(report.created_at).getTime()) / 60000)),
      location: report.location?.trim().slice(0, 100) || undefined,
      note: report.notes?.trim().slice(0, 180) || undefined,
      communityScore: Number(report.upvotes || 0) - Number(report.downvotes || 0),
    }));

  return {
    hasLocation,
    totalNearby: reports.length,
    recent24Hours: recentReports.length,
    attentionSignals: recentReports.filter(isAttentionSignal).length,
    positiveSignals: recentReports.filter(isPositiveSignal).length,
    reportTypes,
    recentSignals,
  };
}

async function getFunctionErrorMessage(error: FunctionInvokeError): Promise<string> {
  try {
    const payload = await error.context?.clone().json() as HyperAiFunctionResponse | undefined;
    if (payload?.error) {
      return payload.error;
    }
  } catch {
    // The stable public error below is safer than leaking provider diagnostics.
  }

  return error.message || 'Hyper AI could not complete this request.';
}

export async function askHyperAi(
  messages: HyperAiMessage[],
  reportContext: HyperAiReportContext,
): Promise<{ answer: string; model?: string }> {
  const compactHistory = messages
    .filter((message) => message.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content: content.slice(0, 1200) }));

  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Hyper AI took too long to respond. Please try again.'));
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    const invocation = supabase.functions.invoke<HyperAiFunctionResponse>('hyper-ai', {
      body: {
        messages: compactHistory,
        reportContext,
      },
    });
    const { data, error } = await Promise.race([invocation, timeout]);

    if (error) {
      throw new Error(await getFunctionErrorMessage(error as FunctionInvokeError));
    }

    const answer = data?.answer?.trim();
    if (!answer) {
      throw new Error(data?.error || 'Hyper AI returned an empty response. Please try again.');
    }

    return { answer, model: data?.model };
  } catch (error) {
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
      throw new Error('Hyper AI could not reach the secure cloud service. Check your connection and try again.');
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}
