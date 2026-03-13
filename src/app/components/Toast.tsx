import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";

interface ToastProps {
  isVisible: boolean;
  message: string;
}

export function Toast({ isVisible, message }: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-12 left-1/2 z-50 flex items-center gap-2 px-5 py-3"
          style={{
            transform: "translateX(-50%)",
            x: "-50%",
            backgroundColor: "var(--popover)",
            borderRadius: "var(--radius-button)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Check size={12} strokeWidth={3} color="var(--primary-foreground)" />
          </div>
          <span
            className="caption text-[var(--foreground)] whitespace-nowrap"
          >
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
