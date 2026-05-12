import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'warn' | 'error' | 'neutral';
}

const variants = {
  teal: 'bg-[#e7edff] text-accent border border-accent/20',
  warn: 'bg-amber-50 text-amber-800 border border-amber-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-neutral text-muted border border-rule',
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variants[variant],
    )}>
      {children}
    </span>
  );
}
