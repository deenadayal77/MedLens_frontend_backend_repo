import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  MessageCircleReply,
  Sparkles,
} from 'lucide-react';
import { SourceChips } from './SourceChips';
import type { ChatMessage } from '../../types';
import { formatAssistantResponse, productResponseToText } from '../../utils/responseFormatter';

interface MessageBubbleProps {
  message: ChatMessage;
  onReply?: (prompt: string) => void;
}

export function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const structured = useMemo(
    () => formatAssistantResponse(message.content, message.prompt),
    [message.content, message.prompt],
  );

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(productResponseToText(structured));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex justify-end"
      >
        <div className="flex max-w-[min(440px,90vw)] flex-col items-end">
          <span className="mb-1 px-1 text-xs font-semibold text-muted">You</span>
          <div className="rounded-[20px] rounded-br-md border border-accent bg-[#e7edff] px-4 py-3 text-sm leading-relaxed text-ink">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex justify-start"
    >
      <div className="flex w-full max-w-[min(620px,100%)] flex-col items-start">
        <span className="mb-1 px-1 text-xs font-semibold text-muted">MedLens AI</span>
        <div className="w-full overflow-hidden rounded-[24px] rounded-bl-md border border-rule bg-white shadow-glow">
          <div className="border-b border-rule p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-rule bg-neutral text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-accent">{structured.context}</p>
                <h3 className="text-lg font-semibold leading-tight text-ink">{structured.heading}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {structured.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-rule bg-neutral px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-ink">Key takeaways</p>
              <div className="space-y-2">
                {structured.takeaways.map((point, index) => (
                  <motion.div
                    key={`${point}-${index}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex gap-2 text-sm leading-snug text-muted"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>{point}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {structured.insight && (
              <div className="rounded-[16px] border border-rule bg-neutral p-3">
                <p className="text-xs font-semibold text-ink">Insight</p>
                <p className="mt-1 text-sm leading-snug text-muted">{structured.insight}</p>
              </div>
            )}

            {structured.action && (
              <div className="rounded-[16px] border border-accent/20 bg-[#e7edff] p-3">
                <p className="text-xs font-semibold text-accent">Next step</p>
                <p className="mt-1 text-sm leading-snug text-ink">{structured.action}</p>
              </div>
            )}

            <button
              onClick={() => setExpanded((value) => !value)}
              className="touch-target mt-2 flex w-full items-center justify-between rounded-[16px] border border-rule bg-neutral px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Show supporting detail
              <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-3">
                    {structured.details.map((detail) => (
                      <p key={detail} className="text-sm leading-relaxed text-muted">{detail}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-3 border-t border-rule">
            <button
              onClick={() => onReply?.(`Can you explain this more simply: ${structured.heading}`)}
              className="touch-target flex items-center justify-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:bg-[#e7edff] hover:text-accent"
            >
              <MessageCircleReply className="h-3.5 w-3.5" />
              Reply
            </button>
            <button
              onClick={handleCopy}
              className="touch-target flex items-center justify-center gap-1.5 border-x border-rule text-xs font-semibold text-muted transition-colors hover:bg-[#e7edff] hover:text-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setSaved((value) => !value)}
              className="touch-target flex items-center justify-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:bg-[#e7edff] hover:text-accent"
            >
              <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-accent text-accent' : ''}`} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {message.sources && message.sources.length > 0 && (
          <SourceChips chunks={message.sources} />
        )}
      </div>
    </motion.div>
  );
}
