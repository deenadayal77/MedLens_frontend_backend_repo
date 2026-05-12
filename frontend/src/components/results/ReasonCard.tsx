import { Lightbulb } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export function ReasonCard({ reason, className }: { reason: string; className?: string }) {
  return (
    <GlassCard delay={0.3} className={className}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] border border-rule bg-white text-accent">
        <Lightbulb className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-semibold text-ink">Reasoning</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{reason}</p>
    </GlassCard>
  );
}
