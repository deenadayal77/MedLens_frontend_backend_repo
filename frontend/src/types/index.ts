export type UrgencyLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface UrgencyData {
  level: UrgencyLevel;
  reason: string;
  confidence: number | null;
  override_applied: boolean;
  override_keywords: string[];
}

export interface AnalyzeResponse {
  session_id: string;
  patient_name: string;
  summary: string;
  urgency: UrgencyData;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;
  sources?: string[];
  timestamp: Date;
}

export interface ChatResponse {
  answer: string;
  source_chunks: string[];
}

export interface TranslateResponse {
  translated_text: string;
}

export type AppPhase = 'idle' | 'uploading' | 'analyzing' | 'results' | 'error';

export interface UrgencyStyle {
  label: string;
  color: string;
  progress: number;
}

export const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  VERY_LOW: {
    label: 'No significant issue',
    color: '#00cec9',
    progress: 5,
  },
  LOW: {
    label: 'Manageable / routine care',
    color: '#00b894',
    progress: 25,
  },
  MODERATE: {
    label: 'Monitor condition',
    color: '#fdcb6e',
    progress: 50,
  },
  HIGH: {
    label: 'Visit doctor soon',
    color: '#e17055',
    progress: 75,
  },
  CRITICAL: {
    label: 'Immediate medical attention required',
    color: '#d63031',
    progress: 100,
  },
};

export const LANGUAGE_MAP: Record<string, string> = {
  English: 'en',
  Hindi: 'hi',
  Telugu: 'te',
  Tamil: 'ta',
  Kannada: 'kn',
  Malayalam: 'ml',
  Bengali: 'bn',
};

export const SUGGESTED_QUESTIONS = [
  'Is this serious?',
  'What does this condition mean?',
  'What should I do next?',
  'Should I be worried?',
];
