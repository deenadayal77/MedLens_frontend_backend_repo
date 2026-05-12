import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
  style?: CSSProperties;
}

export function GlassCard({ children, className, animate = true, delay = 0, style }: GlassCardProps) {
  const base = 'glass p-5 sm:p-6 relative overflow-hidden';

  if (!animate) {
    return <div className={clsx(base, className)} style={style}>{children}</div>;
  }

  return (
    <motion.div
      className={clsx(base, className)}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
