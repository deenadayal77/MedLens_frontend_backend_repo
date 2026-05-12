import ReactMarkdown from 'react-markdown';
import { FileText } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface SummaryCardProps {
  summary: string;
  patientName: string;
  className?: string;
}

export function SummaryCard({ summary, patientName, className }: SummaryCardProps) {
  const hasPatient = patientName && patientName !== 'Not available';

  return (
    <GlassCard delay={0.1} className={className}>
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-rule pb-5 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] border border-rule bg-white text-accent">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Structured summary</h2>
        </div>
        {hasPatient && (
          <span className="w-fit rounded-full border border-rule bg-neutral px-3 py-1 text-xs font-semibold text-muted">
            Patient: {patientName}
          </span>
        )}
      </div>
      <div className="prose-medlens">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </GlassCard>
  );
}
