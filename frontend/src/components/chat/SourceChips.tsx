import { motion } from 'framer-motion';
import { useState } from 'react';

function previewText(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

export function SourceChips({ chunks }: { chunks: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!chunks || chunks.length === 0) return null;

  const visibleChunks = expanded ? chunks : chunks.slice(0, 1);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">Report source</p>
        {chunks.length > 1 && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-semibold text-accent hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      {visibleChunks.map((chunk, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-[12px] border border-rule bg-neutral px-3 py-2 text-xs leading-relaxed text-muted"
        >
          {expanded ? chunk : previewText(chunk)}
        </motion.div>
      ))}
    </div>
  );
}
