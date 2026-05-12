import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  color: string;
  height?: number;
}

export function ProgressBar({ value, color, height = 8 }: ProgressBarProps) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: '#e7ebf2' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </div>
  );
}
