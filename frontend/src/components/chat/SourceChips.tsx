import { motion } from 'framer-motion';

export function SourceChips({ chunks }: { chunks: string[] }) {
  if (!chunks || chunks.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-semibold text-muted">Source chunks</p>
      {chunks.map((chunk, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-[12px] border border-rule bg-neutral px-3 py-2 text-xs leading-relaxed text-muted"
        >
          {chunk}
        </motion.div>
      ))}
    </div>
  );
}
