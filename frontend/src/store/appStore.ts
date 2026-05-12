import { create } from 'zustand';
import type { AnalyzeResponse, ChatMessage, AppPhase } from '../types';

interface AppState {
  phase: AppPhase;
  analysisResult: AnalyzeResponse | null;
  messages: ChatMessage[];
  translatedSummary: string;
  selectedLanguage: string;
  error: string | null;

  setPhase: (phase: AppPhase) => void;
  setAnalysisResult: (result: AnalyzeResponse) => void;
  addMessage: (message: ChatMessage) => void;
  setTranslatedSummary: (text: string) => void;
  setSelectedLanguage: (lang: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as AppPhase,
  analysisResult: null,
  messages: [],
  translatedSummary: '',
  selectedLanguage: 'English',
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setAnalysisResult: (result) => set({
    analysisResult: result,
    phase: 'results',
    messages: [{
      role: 'assistant',
      content: `Urgency level: ${result.urgency.level}. ${result.urgency.reason} You can ask follow-up questions about findings, medical terms, urgency, or next steps to discuss with a doctor.`,
      sources: [],
      timestamp: new Date(),
    }],
  }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setTranslatedSummary: (text) => set({ translatedSummary: text }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setError: (error) => set({ error, phase: 'error' }),
  reset: () => set(initialState),
}));
