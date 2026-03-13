import { motion, AnimatePresence } from "motion/react";

interface MicPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function MicPermissionModal({ isOpen, onAllow, onDeny }: MicPermissionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-[280px] overflow-hidden"
            style={{
              backgroundColor: "var(--popover)",
              borderRadius: "var(--radius-card)",
              backdropFilter: "blur(40px)",
            }}
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <p
                className="body-header text-[var(--foreground)] mb-2"
              >
                "Reclip" Would Like to Access the Microphone
              </p>
              <p
                className="caption text-[var(--muted)]"
              >
                Allow Reclip to access your microphone to capture audio clips.
              </p>
            </div>
            <div
              className="flex border-t"
              style={{ borderColor: "rgba(155, 155, 155, 0.2)" }}
            >
              <button
                onClick={onDeny}
                className="flex-1 py-3 text-center text-[var(--muted)] hover:opacity-80 transition-opacity"
                style={{
                  borderRight: "1px solid rgba(155, 155, 155, 0.2)",
                }}
              >
                Don't Allow
              </button>
              <button
                onClick={onAllow}
                className="flex-1 py-3 text-center text-[var(--accent)] hover:opacity-80 transition-opacity"
              >
                Allow
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
