import { motion } from 'framer-motion';
import { SUGGESTED_QUESTIONS } from '../../types';

interface SuggestedQuestionsProps {
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => !disabled && onSelect(q)}
          disabled={disabled}
          className="rounded-full border border-rule bg-white px-3 py-1.5 text-xs font-semibold text-muted transition-all duration-150 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}
