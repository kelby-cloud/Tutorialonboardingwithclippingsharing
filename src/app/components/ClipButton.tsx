import { motion } from "motion/react";

interface ClipButtonProps {
  onPress: () => void;
  label?: string;
  size?: "lg" | "md";
}

export function ClipButton({ onPress, label = "CLIP", size = "lg" }: ClipButtonProps) {
  const dim = size === "lg" ? 110 : 90;

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dim + 24,
          height: dim + 24,
          background: "radial-gradient(circle, rgba(218, 252, 121, 0.15) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.button
        onClick={onPress}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="relative z-10 flex items-center justify-center"
        style={{
          width: dim,
          height: dim,
          borderRadius: "var(--radius-button)",
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
          fontFamily: "var(--font-druk-cy)",
          fontWeight: "var(--font-weight-heavy)",
          fontSize: size === "lg" ? "var(--text-base)" : "var(--text-label)",
          letterSpacing: "0.05em",
          boxShadow: "0 0 30px rgba(218, 252, 121, 0.3)",
        }}
      >
        {label}
      </motion.button>
    </div>
  );
}