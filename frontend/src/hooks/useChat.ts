import { useCallback, useState } from 'react';
import { sendChat } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { ChatMessage } from '../types';

export function useChat() {
  const { analysisResult, addMessage } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!analysisResult || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content, sources: [], timestamp: new Date() };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      const reply = await sendChat(analysisResult.session_id, content);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply.answer,
        prompt: content,
        sources: reply.source_chunks,
        timestamp: new Date(),
      };
      addMessage(assistantMsg);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I could not process that question. Please try again.',
        prompt: content,
        sources: [],
        timestamp: new Date(),
      };
      addMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [analysisResult, addMessage, isLoading]);

  return { sendMessage, isLoading };
}
