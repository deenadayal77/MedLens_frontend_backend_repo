import { motion } from 'framer-motion';
import { FileSearch, Stethoscope } from 'lucide-react';

export function Navbar() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 sm:px-8 py-3"
      style={{
        background: 'rgba(255, 255, 255, 0.84)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #d9dee8',
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-rule bg-white text-accent shadow-glow">
          <Stethoscope className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-semibold tracking-tight text-ink">MedLens</span>
      </div>

      <div className="hidden sm:flex items-center gap-3 text-sm text-muted">
        <FileSearch className="h-4 w-4 text-accent" />
        <span>Report dashboard</span>
      </div>
    </motion.nav>
  );
}
