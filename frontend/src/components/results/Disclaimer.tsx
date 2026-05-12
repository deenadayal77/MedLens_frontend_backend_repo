import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function Disclaimer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
      <p className="text-sm leading-6 text-amber-900">
        This is an AI-generated analysis and not a medical diagnosis. Please consult a qualified doctor.
      </p>
    </motion.div>
  );
}
