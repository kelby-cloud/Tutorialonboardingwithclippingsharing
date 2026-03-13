import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Screen1InstantStart } from "./components/screens/Screen1InstantStart";
import type { CaptionSegment } from "./components/screens/Screen1InstantStart";
import { Screen3MagicMoment } from "./components/screens/Screen3MagicMoment";
import { Screen4ViralTrigger } from "./components/screens/Screen4ViralTrigger";
import { Screen5FriendLoop } from "./components/screens/Screen5FriendLoop";
import { ScreenOnboarding } from "./components/screens/ScreenOnboarding";
import { TutorialFlow } from "./components/screens/TutorialFlow";
import { Toast } from "./components/Toast";
import { Haptics } from "./utils/haptics";
import { ReclipLogo } from "./components/ReclipLogo";
import { initAudioUnlock } from "./utils/audioUnlock";

type Screen = "tutorial" | "start" | "magic" | "viral" | "onboarding" | "friends" | "done";

const screenVariants = {
  enter: { opacity: 0, x: 60, scale: 0.97 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -60, scale: 0.97 },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("tutorial");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const audioBlobRef = useRef<Blob | null>(null);
  const captionsRef = useRef<CaptionSegment[]>([]);

  // Initialize audio unlock listener on mount — first user interaction
  // (tutorial tap, etc.) will unlock audio for the entire session
  useEffect(() => {
    initAudioUnlock();
  }, []);

  const showToastMsg = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }, []);

  const resetToStart = () => {
    setScreen("start");
  };

  const handleTutorialComplete = () => {
    setScreen("start");
  };

  const handleClipSaved = (audioBlob: Blob | null, captions: CaptionSegment[], durationSec: number) => {
    audioBlobRef.current = audioBlob;
    captionsRef.current = captions;

    // Format duration: e.g. "Saved 0:23 of 2:00"
    const MAX_DURATION = 120; // 2 minutes in seconds
    const clampedDur = Math.min(durationSec, MAX_DURATION);
    const durMins = Math.floor(clampedDur / 60);
    const durSecs = Math.floor(clampedDur % 60);
    const durStr = `${durMins}:${durSecs.toString().padStart(2, "0")}`;
    const maxStr = `${Math.floor(MAX_DURATION / 60)}:${(MAX_DURATION % 60).toString().padStart(2, "0")}`;
    showToastMsg(`Saved ${durStr} of ${maxStr}`);

    // Transition to magic screen quickly to keep user gesture chain alive for autoplay
    setTimeout(() => setScreen("magic"), 400);
  };
  const handleShare = () => setScreen("viral");
  const handleSend = () => {
    setScreen("onboarding");
  };
  const handleInvite = () => {
    showToastMsg("Invites sent!");
    setTimeout(() => setScreen("done"), 1000);
  };
  const handleSkip = () => setScreen("done");

  const handleOnboardingComplete = () => {
    setScreen("friends");
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: "var(--background)",
      }}
    >
      <Toast isVisible={showToast} message={toastMessage} />

      {/* ── Persistent Reclip Logo — top-center on all screens ── */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none"
        style={{
          paddingTop: 12,
          paddingLeft: "var(--page-px)",
          paddingRight: "var(--page-px)",
          zIndex: 40,
        }}
      >
        <ReclipLogo maxHeight={32} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {screen === "tutorial" && (
            <TutorialFlow onComplete={handleTutorialComplete} />
          )}
          {screen === "start" && (
            <Screen1InstantStart onClipSaved={handleClipSaved} />
          )}
          {screen === "magic" && (
            <Screen3MagicMoment
              onShare={handleShare}
              audioBlob={audioBlobRef.current}
              captions={captionsRef.current}
            />
          )}
          {screen === "viral" && (
            <Screen4ViralTrigger
              onContinue={handleSend}
              onShowToast={showToastMsg}
              audioBlob={audioBlobRef.current}
            />
          )}
          {screen === "onboarding" && (
            <ScreenOnboarding onComplete={handleOnboardingComplete} />
          )}
          {screen === "friends" && (
            <Screen5FriendLoop
              onInvite={handleInvite}
              onSkip={handleSkip}
            />
          )}
          {screen === "done" && (
            <DoneScreen onReplay={resetToStart} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Done Screen ───
function DoneScreen({ onReplay }: { onReplay: () => void }) {
  // Fire success haptic when the done screen mounts
  useEffect(() => {
    const t = setTimeout(() => Haptics.success(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-between h-full w-full"
      style={{
        backgroundColor: "var(--background)",
        paddingTop: "var(--page-pt)",
        paddingBottom: "var(--page-pb)",
        paddingLeft: "var(--page-px)",
        paddingRight: "var(--page-px)",
      }}
    >
      <div />

      <div className="flex flex-col items-center gap-8 w-full" style={{ maxWidth: "var(--page-max-w)" }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--primary)",
            boxShadow: "0 0 80px rgba(218, 252, 121, 0.3)",
          }}
        >
          <span style={{ fontSize: 44 }}>🎉</span>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h3
            className="text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: "var(--text-h3)",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            You're in.
          </h3>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[var(--muted)] text-center"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-normal)",
            fontSize: "var(--text-base)",
            lineHeight: 1.6,
          }}
        >
          Start catching moments.
        </motion.p>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        <button
          onClick={() => { Haptics.medium(); onReplay(); }}
          className="w-full py-4 text-[var(--foreground)] transition-opacity hover:opacity-80"
          style={{
            borderRadius: "var(--radius-button)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(155, 155, 155, 0.15)",
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-bold)",
            fontSize: "var(--text-base)",
          }}
        >
          Replay
        </button>
      </motion.div>
    </div>
  );
}