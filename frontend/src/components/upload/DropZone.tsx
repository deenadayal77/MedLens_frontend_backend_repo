import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, FileText, ScanText, Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileAccepted, disabled }: DropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState(false);

  const onDrop = useCallback((accepted: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      setRejected(true);
      window.setTimeout(() => setRejected(false), 2500);
      return;
    }
    if (accepted.length > 0) {
      setSelectedFile(accepted[0]);
      setRejected(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled,
  });
  const rootProps = getRootProps() as any;

  return (
    <div className="space-y-4">
      <motion.div
        {...rootProps}
        className={clsx(
          'relative cursor-pointer select-none rounded-[24px] border bg-white p-6 text-left transition-all duration-300 sm:p-8',
          isDragActive
            ? 'border-accent bg-blue-50 shadow-glow'
            : rejected
              ? 'border-red-300 bg-red-50'
              : selectedFile
                ? 'border-accent bg-blue-50'
                : 'border-rule hover:border-accent hover:bg-neutral',
          disabled && 'cursor-not-allowed opacity-40',
        )}
        whileHover={!disabled ? { scale: 1.005 } : {}}
        whileTap={!disabled ? { scale: 0.998 } : {}}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {rejected ? (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-4"
            >
              <AlertCircle className="mt-1 h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-ink">Only PDF files are accepted</p>
                <p className="mt-1 text-sm text-muted">Choose a radiology or clinical PDF report.</p>
              </div>
            </motion.div>
          ) : selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-accent bg-white text-accent">
                <FileText className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{selectedFile.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {(selectedFile.size / 1024).toFixed(1)} KB · PDF
                </p>
                <p className="mt-2 text-xs text-muted">Drop another file to replace this report.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-start justify-between gap-4">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-rule bg-neutral text-accent"
                  animate={isDragActive ? { scale: 1.08, rotate: 2 } : { scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Upload className="h-7 w-7" />
                </motion.div>
                <ScanText className="mt-2 hidden h-5 w-5 text-accent sm:block" />
              </div>
              <div>
                <p className="text-xl font-semibold text-ink">
                  {isDragActive ? 'Drop your report here' : 'Upload medical report'}
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Drag and drop or browse for a PDF. Image-based files move through OCR before summary, urgency, translation, and chat are available.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {selectedFile && !disabled && (
          <motion.button
            key="analyze-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => onFileAccepted(selectedFile)}
            className="w-full rounded-[18px] bg-accent px-5 py-4 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.005] hover:shadow-glow-lg active:scale-[0.99]"
          >
            Analyze report
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
