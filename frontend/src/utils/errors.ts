const GENERIC_ANALYSIS_ERROR = 'Analysis failed. Please try again with a clear PDF, or try again later.';

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value) {
    return String((value as { message?: unknown }).message ?? '');
  }
  return '';
}

export function getAnalysisErrorMessage(err: any): string {
  const raw = asText(err?.response?.data?.detail) || asText(err?.message);
  const lower = raw.toLowerCase();

  if (
    err?.response?.status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded') ||
    lower.includes('current quota')
  ) {
    return 'The AI usage quota has been reached for this deployment. Please try again later, or update the Gemini API billing/quota and redeploy.';
  }

  if (lower.includes('api key') || lower.includes('permission') || lower.includes('unauth')) {
    return 'The AI service is not configured correctly. Please check the backend API key.';
  }

  if (!raw || raw.length > 220 || lower.includes('googleapis.com') || lower.includes('{')) {
    return GENERIC_ANALYSIS_ERROR;
  }

  return raw;
}
