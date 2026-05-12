import { motion } from 'framer-motion';
import { FileSearch, ScanText, Sparkles } from 'lucide-react';

const STEPS = [
  'OCR extraction',
  'Report structure',
  'Patient summary',
  'Urgency check',
  'Chat grounding',
];

export function AnalyzingState() {
  return (
    <motion.div
      className="grid-panel p-4 sm:p-6"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-rule pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-accent">Analyzing...</p>
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Processing report</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted">
          OCR, classification, and retrieval setup run together so the first answer is grounded in the uploaded PDF.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-rule bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <FileSearch className="h-4 w-4 text-accent" />
            PDF preview
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-rule bg-neutral p-5">
            <div className="mb-5 h-4 w-28 rounded-full skeleton-line" />
            <div className="space-y-3">
              <div className="h-3 rounded-full skeleton-line" />
              <div className="h-3 w-10/12 rounded-full skeleton-line" />
              <div className="h-3 w-11/12 rounded-full skeleton-line" />
              <div className="my-5 h-28 rounded-[18px] border border-accent/30 bg-white">
                <motion.div
                  className="h-10 border-y border-accent/30 bg-[#e7edff]"
                  animate={{ y: ['-30%', '260%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <div className="h-3 w-8/12 rounded-full skeleton-line" />
              <div className="h-3 w-9/12 rounded-full skeleton-line" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-rule bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <ScanText className="h-4 w-4 text-accent" />
            Extraction pipeline
          </div>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.22, duration: 0.3 }}
                className="rounded-[18px] border border-rule bg-neutral p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{step}</span>
                  {i === 0 ? (
                    <motion.span
                      className="h-2 w-2 rounded-full bg-accent"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  ) : (
                    <Sparkles className="h-4 w-4 text-accent/50" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
