import { useCallback } from 'react';
import { analyzeReport } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getAnalysisErrorMessage } from '../utils/errors';

export function useAnalysis() {
  const { setPhase, setAnalysisResult, setError, reset } = useAppStore();

  const analyze = useCallback(async (file: File) => {
    reset();
    setPhase('analyzing');
    try {
      const result = await analyzeReport(file);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(getAnalysisErrorMessage(err));
    }
  }, [reset, setPhase, setAnalysisResult, setError]);

  return { analyze };
}
