import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, Send, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MessageBubble } from './MessageBubble';
import { SuggestedQuestions } from './SuggestedQuestions';
import { Spinner } from '../ui/Spinner';
import { useAppStore } from '../../store/appStore';
import { useChat } from '../../hooks/useChat';

function ThinkingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mb-4 max-w-[min(620px,100%)] rounded-[22px] border border-rule bg-white p-4 shadow-glow"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-rule bg-neutral text-accent">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-semibold leading-tight text-ink">Analyzing...</p>
          <p className="text-xs font-semibold text-muted">Thinking through report context</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-11/12 rounded-full skeleton-line" />
        <div className="h-3 w-8/12 rounded-full skeleton-line" />
        <div className="h-3 w-10/12 rounded-full skeleton-line" />
      </div>
    </motion.div>
  );
}

export function ChatPanel({ className }: { className?: string }) {
  const { messages } = useAppStore();
  const { sendMessage, isLoading } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (content?: string) => {
    const text = content ?? input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <GlassCard delay={0.5} className={`flex min-h-[640px] flex-col ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-rule pb-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-semibold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-rule bg-white text-accent">
              <Sparkles className="h-5 w-5" />
            </span>
            Report chat
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ask follow-up questions. Answers stay grounded in the uploaded report.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-[22px] border border-rule bg-neutral p-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
          <BrainCircuit className="h-3.5 w-3.5 text-accent" />
          Input hints
        </div>
        <SuggestedQuestions onSelect={handleSend} disabled={isLoading} />
      </div>

      <div className="mb-4 max-h-[70vh] min-h-[360px] flex-1 space-y-1 overflow-y-auto pr-2">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.timestamp}-${i}`} message={msg} onReply={handleSend} />
          ))}
        </AnimatePresence>

        <AnimatePresence>{isLoading && <ThinkingCard />}</AnimatePresence>

        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about symptoms, next steps, or terms in the report..."
          rows={1}
          disabled={isLoading}
          className="min-h-11 flex-1 resize-none rounded-[18px] border border-rule bg-white px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <motion.button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          whileTap={{ scale: 0.93 }}
          className="touch-target flex shrink-0 items-center justify-center rounded-[18px] bg-accent text-white transition-all hover:shadow-glow disabled:opacity-30"
          aria-label="Send message"
        >
          {isLoading ? <Spinner size={16} /> : <Send className="h-4 w-4" />}
        </motion.button>
      </div>
    </GlassCard>
  );
}
