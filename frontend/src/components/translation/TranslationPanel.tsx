import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Languages, Volume2 } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { GlassCard } from '../ui/GlassCard';
import { translateText, fetchTTSBlob } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import { LANGUAGE_MAP } from '../../types';

interface TranslationPanelProps {
  summary: string;
  sessionId: string;
  className?: string;
}

export function TranslationPanel({ summary, sessionId, className }: TranslationPanelProps) {
  const [open, setOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [playingTTS, setPlayingTTS] = useState(false);
  const { translatedSummary, selectedLanguage, setTranslatedSummary, setSelectedLanguage } = useAppStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTranslate = async () => {
    const code = LANGUAGE_MAP[selectedLanguage];
    if (code === 'en') {
      setTranslatedSummary(summary);
      return;
    }
    setTranslating(true);
    try {
      const result = await translateText(sessionId, summary, code);
      setTranslatedSummary(result.translated_text);
    } catch {
      alert('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleReadAloud = async () => {
    const text = translatedSummary || summary;
    const code = LANGUAGE_MAP[selectedLanguage];
    setPlayingTTS(true);
    try {
      const blob = await fetchTTSBlob(text, code);
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch {
      alert('Audio generation failed.');
    } finally {
      setPlayingTTS(false);
    }
  };

  return (
    <GlassCard delay={0.4} className={`overflow-visible ${className ?? ''}`}>
      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingTTS(false)} />

      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-rule bg-white text-accent">
            <Languages className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-ink">Translation and audio</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-5 w-5 text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="min-h-11 flex-1 cursor-pointer rounded-[16px] border border-rule bg-white px-4 py-2.5 text-sm text-ink transition-colors focus:border-accent focus:outline-none"
                >
                  {Object.keys(LANGUAGE_MAP).map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>

                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="touch-target flex items-center justify-center gap-2 rounded-[16px] border border-accent bg-[#e7edff] px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-white disabled:opacity-50"
                >
                  {translating ? <Spinner size={16} /> : <Languages className="h-4 w-4" />}
                  Translate
                </button>

                <button
                  onClick={handleReadAloud}
                  disabled={playingTTS}
                  className="touch-target flex items-center justify-center gap-2 rounded-[16px] border border-rule bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {playingTTS ? <Spinner size={16} /> : <Volume2 className="h-4 w-4" />}
                  Read
                </button>
              </div>

              <AnimatePresence>
                {translatedSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[18px] border border-rule bg-neutral p-4 text-sm leading-relaxed text-muted"
                  >
                    {translatedSummary}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
