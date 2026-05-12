import axios from 'axios';
import type { AnalyzeResponse, ChatResponse, TranslateResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300_000, // AI calls can be slow on full medical PDFs
});

export async function analyzeReport(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<AnalyzeResponse>('/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function sendChat(sessionId: string, message: string): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', {
    session_id: sessionId,
    message,
  });
  return data;
}

export async function translateText(
  sessionId: string,
  text: string,
  targetLanguageCode: string,
): Promise<TranslateResponse> {
  const { data } = await api.post<TranslateResponse>('/translate', {
    session_id: sessionId,
    text,
    target_language_code: targetLanguageCode,
  });
  return data;
}

export function getTTSUrl(text: string, languageCode: string): string {
  const params = new URLSearchParams({ text, language_code: languageCode });
  return `${API_BASE_URL}/tts?${params}`;
}

export async function fetchTTSBlob(text: string, languageCode: string): Promise<Blob> {
  const { data } = await api.post('/tts', { text, language_code: languageCode }, {
    responseType: 'blob',
  });
  return data;
}
