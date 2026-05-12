import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileSearch,
  Languages,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { DropZone } from './components/upload/DropZone';
import { AnalyzingState } from './components/upload/AnalyzeButton';
import { SummaryCard } from './components/results/SummaryCard';
import { UrgencyCard } from './components/results/UrgencyCard';
import { ReasonCard } from './components/results/ReasonCard';
import { Disclaimer } from './components/results/Disclaimer';
import { useAppStore } from './store/appStore';
import { useAnalysis } from './hooks/useAnalysis';
import type { AnalyzeResponse } from './types';

const TranslationPanel = lazy(() =>
  import('./components/translation/TranslationPanel').then((mod) => ({ default: mod.TranslationPanel })),
);

const ChatPanel = lazy(() =>
  import('./components/chat/ChatPanel').then((mod) => ({ default: mod.ChatPanel })),
);

function HeroSection({ onAnalyze }: { onAnalyze: (file: File) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <div className="grid-panel p-6 sm:p-8 lg:min-h-[390px]">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-accent">
          <ShieldCheck className="h-4 w-4" />
          Report-grounded medical assistant
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[0.96] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Read a medical PDF in minutes.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Upload a radiology or clinical report to generate a structured summary, urgency level, translation, and follow-up chat grounded in the document.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {['OCR extraction', 'Urgency triage', 'Grounded chat'].map((item, index) => (
            <div key={item} className="border-t border-rule pt-3">
              <p className="text-xs text-muted">0{index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-5">
        <DropZone onFileAccepted={onAnalyze} />
        <div className="grid-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink">PDF workflow</h2>
            <FileSearch className="h-5 w-5 text-accent" />
          </div>
          <div className="space-y-3">
            {['Original preview', 'Structured text', 'Mapped evidence', 'Assistant answers'].map((step) => (
              <div key={step} className="flex items-center justify-between border-t border-rule pt-3 text-sm">
                <span className="font-medium text-ink">{step}</span>
                <ArrowRight className="h-4 w-4 text-accent" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ResultsHeader({ result, onReset }: { result: AnalyzeResponse; onReset: () => void }) {
  const patient = result.patient_name && result.patient_name !== 'Not available' ? result.patient_name : 'Patient details unavailable';

  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="mb-2 text-sm font-semibold text-accent">Analysis complete</p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Clinical report dashboard</h1>
        <p className="mt-3 text-sm text-muted">{patient}</p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rule bg-white px-4 py-2 text-sm font-semibold text-ink transition-all hover:border-accent hover:text-accent"
      >
        <RefreshCw className="h-4 w-4" />
        New report
      </button>
    </div>
  );
}

function compactText(value: string, fallback: string) {
  const clean = value
    .replace(/[#*_`>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return fallback;
  return clean.length > 96 ? `${clean.slice(0, 93)}...` : clean;
}

function EvidenceRail({ result }: { result: AnalyzeResponse }) {
  const evidenceItems = [
    {
      label: 'Extracted report text',
      value: compactText(result.summary, 'Text was extracted and prepared for summary generation.'),
    },
    {
      label: 'Summary source',
      value: compactText(result.summary, 'Summary is grounded in the uploaded report text.'),
    },
    {
      label: 'Urgency rationale',
      value: compactText(result.urgency.reason, 'Urgency rationale is available from the analysis result.'),
    },
  ];

  return (
    <div className="grid-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">PDF evidence map</h2>
          <p className="mt-1 text-sm text-muted">Completed extraction signals used by summary, urgency, and chat.</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-accent/20 bg-[#e7edff] text-accent">
          <Check className="h-4 w-4" />
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[20px] border border-rule bg-neutral p-4">
          <div className="rounded-[16px] border border-rule bg-white p-4">
            <div className="mb-4 flex items-center justify-between border-b border-rule pb-3">
              <p className="text-sm font-semibold text-ink">Uploaded PDF</p>
              <span className="rounded-full border border-accent/20 bg-[#e7edff] px-2.5 py-1 text-xs font-semibold text-accent">
                Parsed
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-[14px] border border-rule bg-neutral p-3">
                <p className="font-semibold text-ink">Patient</p>
                <p className="mt-1 text-muted">
                  {result.patient_name && result.patient_name !== 'Not available'
                    ? result.patient_name
                    : 'Not available in report'}
                </p>
              </div>
              <div className="rounded-[14px] border border-accent/30 bg-[#e7edff] p-3">
                <p className="font-semibold text-accent">Evidence ready</p>
                <p className="mt-1 leading-5 text-muted">
                  This panel confirms the report has been processed. Source snippets appear inside chat answers when available.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {evidenceItems.map((item, index) => (
            <div key={item.label} className="rounded-[18px] border border-rule bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <span className="text-xs font-semibold text-accent">0{index + 1}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LazyPanelFallback() {
  return (
    <div className="glass flex min-h-[220px] items-center justify-center p-6">
      <div className="flex items-center gap-3 text-sm font-semibold text-accent">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Loading workspace
      </div>
    </div>
  );
}

export default function App() {
  const { phase, analysisResult, error, reset } = useAppStore();
  const { analyze } = useAnalysis();

  return (
    <div className="dashboard-shell">
      <Navbar />

      <main className="relative z-10 mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {(phase === 'idle' || phase === 'uploading') && (
            <motion.div key="idle" exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
              <HeroSection onAnalyze={analyze} />
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div className="grid-panel p-5">
                  <Languages className="mb-4 h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold text-ink">Translation-ready</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Summaries can be translated after analysis without losing the original report context.</p>
                </div>
                <div className="grid-panel p-5 lg:col-span-2">
                  <h2 className="text-lg font-semibold text-ink">AI interaction states</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {['Idle hints', 'Analyzing', 'Streaming', 'Completed card'].map((state) => (
                      <div key={state} className="border-t border-rule pt-3 text-sm font-semibold text-ink">{state}</div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyzingState />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl"
            >
              <div className="grid-panel p-8">
                <AlertCircle className="mb-4 h-10 w-10 text-red-600" />
                <h2 className="text-2xl font-semibold text-ink">Analysis failed</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
                <button
                  onClick={reset}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-[18px] bg-accent px-5 py-2 text-sm font-semibold text-white transition-all hover:shadow-glow"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'results' && analysisResult && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ResultsHeader result={analysisResult} onReset={reset} />

              <div className="bento-grid lg:grid-cols-12">
                <div className="lg:col-span-5 xl:col-span-4">
                  <EvidenceRail result={analysisResult} />
                </div>
                <SummaryCard
                  summary={analysisResult.summary}
                  patientName={analysisResult.patient_name}
                  className="lg:col-span-7 xl:col-span-5"
                />
                <div className="grid gap-4 lg:col-span-12 xl:col-span-3">
                  <UrgencyCard urgency={analysisResult.urgency} />
                  <ReasonCard reason={analysisResult.urgency.reason} />
                </div>
                <Suspense fallback={<LazyPanelFallback />}>
                  <TranslationPanel
                    summary={analysisResult.summary}
                    sessionId={analysisResult.session_id}
                    className="lg:col-span-5"
                  />
                </Suspense>
                <Suspense fallback={<LazyPanelFallback />}>
                  <ChatPanel className="lg:col-span-7" />
                </Suspense>
                <div className="lg:col-span-12">
                  <Disclaimer />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
