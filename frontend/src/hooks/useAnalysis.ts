import { useCallback } from 'react';
import { analyzeReport } from '../api/client';
import { useAppStore } from '../store/appStore';

export function useAnalysis() {
  const { setPhase, setAnalysisResult, setError, reset } = useAppStore();

  const analyze = useCallback(async (file: File) => {
    reset();
    setPhase('analyzing');
    try {
      const result = await analyzeReport(file);
      setAnalysisResult(result);
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Analysis failed. Check your API key and try again.';
      setError(message);
    }
  }, [reset, setPhase, setAnalysisResult, setError]);

  return { analyze };
}
