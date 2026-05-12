import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { URGENCY_STYLES } from '../../types';
import type { UrgencyData } from '../../types';

interface UrgencyCardProps {
  urgency: UrgencyData;
  className?: string;
}

export function UrgencyCard({ urgency, className }: UrgencyCardProps) {
  const style = URGENCY_STYLES[urgency.level];

  return (
    <GlassCard delay={0.2} className={className}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] border border-rule bg-white text-accent">
            <Gauge className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-ink">Urgency level</h2>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-accent">{style.progress}</div>
          <div className="text-xs text-muted">of 100</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-semibold text-ink">{urgency.level.replace('_', ' ')}</div>
        <div className="mt-1 text-sm text-muted">{style.label}</div>
      </div>

      <ProgressBar value={style.progress} color={style.color} height={10} />

      {urgency.confidence !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 rounded-[16px] border border-rule bg-neutral px-3 py-2 text-sm font-semibold text-muted"
        >
          Confidence: {Math.round(urgency.confidence * 100)}%
        </motion.div>
      )}

      {urgency.override_applied && urgency.override_keywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex flex-wrap gap-2"
        >
          {urgency.override_keywords.map((kw) => (
            <Badge key={kw} variant="error">{kw}</Badge>
          ))}
        </motion.div>
      )}
    </GlassCard>
  );
}
