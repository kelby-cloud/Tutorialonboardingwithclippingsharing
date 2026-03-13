import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronDown, ChevronLeft, AlertCircle } from "lucide-react";
import { Haptics } from "../../utils/haptics";

type Step = "name" | "age" | "phone" | "otp" | "username";

// ─── Keyboard visibility hook ───
function useKeyboardVisible() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const heightDiff = window.innerHeight - vv.height;
      // Only treat as keyboard if the difference is significant (> 100px)
      setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return keyboardHeight;
}

interface ScreenOnboardingProps {
  onComplete: () => void;
}

// ─── Shared animated wrapper for each step ───
function StepWrapper({
  children,
  stepKey,
}: {
  children: React.ReactNode;
  stepKey: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col flex-1 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Continue Button (tutorial-style with fill, keyboard-aware) ───
function ContinueButton({
  enabled,
  onClick,
  label = "Continue",
  delay = 0.5,
}: {
  enabled: boolean;
  onClick: () => void;
  label?: string;
  delay?: number;
}) {
  const keyboardHeight = useKeyboardVisible();
  const isKeyboardOpen = keyboardHeight > 0;

  const handleClick = () => {
    if (enabled) {
      Haptics.medium();
      onClick();
    } else {
      Haptics.warning();
    }
  };

  return (
    <motion.div
      animate={{
        paddingBottom: isKeyboardOpen ? Math.max(keyboardHeight - 40, 8) : 32,
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-full shrink-0"
      style={{ zIndex: 50 }}
    >
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.4 }}
        whileTap={enabled ? { scale: 0.96 } : {}}
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 py-4 px-6"
        style={{
          borderRadius: "var(--radius-button)",
          borderWidth: 1,
          borderStyle: "solid",
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-bold)",
          fontSize: "var(--text-base)",
          backgroundColor: enabled ? "var(--primary)" : "transparent",
          color: enabled ? "var(--primary-foreground)" : "rgba(155, 155, 155, 0.5)",
          borderColor: enabled ? "transparent" : "rgba(155, 155, 155, 0.2)",
          cursor: enabled ? "pointer" : "default",
          transition:
            "background-color 0.5s cubic-bezier(0.4,0,0.2,1), color 0.5s cubic-bezier(0.4,0,0.2,1), border-color 0.5s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {label}
        <ChevronRight size={20} />
      </motion.button>
    </motion.div>
  );
}

// ─── Blinking cursor ───
function BlinkingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
      className="inline-block w-[2px] h-[1.1em] ml-1 align-middle"
      style={{ backgroundColor: "var(--accent)" }}
    />
  );
}

// ─── Inline error pill ───
function ErrorPill({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-1.5 px-3 py-1.5 self-center mt-4"
      style={{
        backgroundColor: "rgba(252, 49, 88, 0.12)",
        borderRadius: "var(--radius-button)",
        border: "1px solid rgba(252, 49, 88, 0.25)",
      }}
    >
      <AlertCircle size={13} color="var(--destructive)" />
      <span
        style={{
          fontFamily: "var(--font-sf-pro)",
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-normal)",
          color: "var(--destructive)",
        }}
      >
        {message}
      </span>
    </motion.div>
  );
}

// ─── Back Button ───
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => { Haptics.light(); onClick(); }}
      className="absolute left-0 top-0 flex items-center gap-0.5 py-1 pr-2"
      style={{
        color: "var(--muted)",
        zIndex: 10,
      }}
    >
      <ChevronLeft size={20} color="var(--muted)" />
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-normal)",
          fontSize: "var(--text-label)",
          color: "var(--muted)",
        }}
      >
        Back
      </span>
    </motion.button>
  );
}

// ─── Birthday validation helpers ───
function parseBirthday(raw: string): { day: number; month: number; year: number } | null {
  if (raw.length !== 8) return null;
  const month = parseInt(raw.slice(0, 2), 10);
  const day = parseInt(raw.slice(2, 4), 10);
  const year = parseInt(raw.slice(4, 8), 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return { day, month, year };
}

function validateBirthday(raw: string): string | null {
  const parsed = parseBirthday(raw);
  if (!parsed) return null;
  const { day, month, year } = parsed;

  if (month < 1 || month > 12) return "Invalid month";
  if (day < 1 || day > 31) return "Invalid day";

  // Days in month check
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return `${month}/${year} only has ${daysInMonth} days`;

  const bDate = new Date(year, month - 1, day);
  const today = new Date();

  if (bDate > today) return "Birthday can't be in the future";

  // Age check (must be 13+)
  const age = today.getFullYear() - bDate.getFullYear();
  const monthDiff = today.getMonth() - bDate.getMonth();
  const dayDiff = today.getDate() - bDate.getDate();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  if (actualAge < 13) return "You must be at least 13 to use Reclip";
  if (actualAge > 120) return "Please enter a valid birth year";

  return null; // valid
}

// ─── Phone validation helper ───
function validatePhone(digits: string, countryCode: string): string | null {
  const minLengths: Record<string, number> = {
    "+1": 10,
    "+44": 10,
    "+91": 10,
    "+61": 9,
    "+81": 10,
    "+49": 10,
    "+33": 9,
    "+55": 10,
    "+82": 9,
    "+52": 10,
  };
  const minLen = minLengths[countryCode] || 7;
  if (digits.length < minLen) return `Enter at least ${minLen} digits for ${countryCode}`;
  if (digits.length > 15) return "Phone number is too long";
  return null;
}

// ─── Step 1: Name ───
function NameStep({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onContinue,
}: {
  firstName: string;
  lastName: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onContinue: () => void;
}) {
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);
  const [focusField, setFocusField] = useState<"first" | "last">("first");

  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const canContinue = firstName.trim().length >= 1 && lastName.trim().length >= 1;

  const handleFirstKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && firstName.trim()) {
      lastRef.current?.focus();
      setFocusField("last");
    }
  };

  const handleLastKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue) {
      onContinue();
    }
  };

  return (
    <StepWrapper stepKey="name">
      {/* Question */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-2"
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-semi-bold)",
          fontSize: "var(--text-base)",
          color: "var(--foreground)",
          lineHeight: 1.5,
        }}
      >
        What's your name?
      </motion.p>

      {/* Display area */}
      <div className="flex-1 flex flex-col items-center justify-start pt-4 gap-4">
        {/* First name */}
        <div className="relative w-full text-center">
          <input
            ref={firstRef}
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            onFocus={() => setFocusField("first")}
            onKeyDown={handleFirstKeyDown}
            placeholder="First name"
            autoCapitalize="words"
            autoComplete="given-name"
            className="w-full text-center outline-none bg-transparent caret-transparent"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: firstName ? "var(--text-entry)" : "var(--text-h3)",
              lineHeight: 1.2,
              color: firstName ? "var(--foreground)" : "transparent",
              textTransform: "uppercase",
              transition: "font-size 0.3s",
            }}
          />
          {/* Overlay display with cursor */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: firstName ? "var(--text-entry)" : "var(--text-h3)",
              lineHeight: 1.2,
              textTransform: "uppercase",
              color: firstName ? "var(--foreground)" : "var(--muted)",
              opacity: firstName ? 1 : 0.35,
              transition: "font-size 0.3s",
            }}
          >
            <span>{firstName || "First name"}</span>
            {focusField === "first" && <BlinkingCursor />}
          </div>
        </div>

        {/* Last name */}
        <div className="relative w-full text-center">
          <input
            ref={lastRef}
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            onFocus={() => setFocusField("last")}
            onKeyDown={handleLastKeyDown}
            placeholder="Last name"
            autoCapitalize="words"
            autoComplete="family-name"
            className="w-full text-center outline-none bg-transparent caret-transparent"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: lastName ? "var(--text-entry)" : "var(--text-h3)",
              lineHeight: 1.2,
              color: lastName ? "var(--foreground)" : "transparent",
              textTransform: "uppercase",
              transition: "font-size 0.3s",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: lastName ? "var(--text-entry)" : "var(--text-h3)",
              lineHeight: 1.2,
              textTransform: "uppercase",
              color: lastName ? "var(--foreground)" : "var(--muted)",
              opacity: lastName ? 1 : 0.35,
              transition: "font-size 0.3s",
            }}
          >
            <span>{lastName || "Last name"}</span>
            {focusField === "last" && <BlinkingCursor />}
          </div>
        </div>
      </div>

      {/* Continue */}
      <ContinueButton enabled={canContinue} onClick={onContinue} />
    </StepWrapper>
  );
}

// ─── Step 2: Age / Birthday ───
function AgeStep({
  firstName,
  birthday,
  onBirthdayChange,
  onContinue,
  onBack,
}: {
  firstName: string;
  birthday: string; // DDMMYYYY
  onBirthdayChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Parse display segments
  const mm = birthday.slice(0, 2);
  const dd = birthday.slice(2, 4);
  const yyyy = birthday.slice(4, 8);
  const isComplete = birthday.length === 8;

  // Validate on completion
  useEffect(() => {
    if (isComplete) {
      const err = validateBirthday(birthday);
      setError(err);
    } else {
      setError(null);
      setAttempted(false);
    }
  }, [birthday, isComplete]);

  const canContinue = isComplete && !error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    onBirthdayChange(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (canContinue) {
        onContinue();
      } else if (isComplete) {
        setAttempted(true);
      }
    }
  };

  const handleContinue = () => {
    if (canContinue) {
      onContinue();
    } else if (isComplete) {
      setAttempted(true);
    }
  };

  // Build display segments
  const segments: { value: string; placeholder: string }[] = [
    { value: mm, placeholder: "MM" },
    { value: dd, placeholder: "DD" },
    { value: yyyy, placeholder: "YYYY" },
  ];

  // Determine which segment the cursor is in
  const cursorSegment =
    birthday.length < 2 ? 0 : birthday.length < 4 ? 1 : birthday.length < 8 ? 2 : -1;

  // Compute age display
  const parsed = isComplete ? parseBirthday(birthday) : null;
  let ageDisplay: string | null = null;
  if (parsed && !error) {
    const bDate = new Date(parsed.year, parsed.month - 1, parsed.day);
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const mDiff = today.getMonth() - bDate.getMonth();
    const dDiff = today.getDate() - bDate.getDate();
    if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) age--;
    ageDisplay = `${age} years old`;
  }

  return (
    <StepWrapper stepKey="age">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-2"
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-semi-bold)",
          fontSize: "var(--text-base)",
          color: "var(--foreground)",
          lineHeight: 1.5,
        }}
      >
        Hi {firstName}, when's your birthday?
      </motion.p>

      <div className="flex-1 flex flex-col items-center justify-start pt-4">
        {/* Hidden input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={birthday}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 w-0 h-0"
          autoComplete="bday"
        />

        {/* Visual display */}
        <div
          className="flex items-baseline justify-center gap-5 w-full cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {segments.map((seg, i) => (
            <div key={i} className="flex items-baseline">
              <span
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-entry)",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                  color: seg.value
                    ? error && (attempted || isComplete)
                      ? "var(--destructive)"
                      : "var(--foreground)"
                    : "var(--muted)",
                  opacity: seg.value ? 1 : 0.35,
                  transition: "color 0.3s",
                }}
              >
                {seg.value || seg.placeholder}
              </span>
              {cursorSegment === i && <BlinkingCursor />}
            </div>
          ))}
        </div>

        {/* Age display or error */}
        <AnimatePresence mode="wait">
          {error && (attempted || isComplete) ? (
            <ErrorPill key="error" message={error} />
          ) : ageDisplay ? (
            <motion.div
              key="age"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 px-4 py-1.5"
              style={{
                backgroundColor: "rgba(218, 252, 121, 0.1)",
                borderRadius: "var(--radius-button)",
                border: "1px solid rgba(218, 252, 121, 0.2)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sf-pro)",
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-semi-bold)",
                  color: "var(--primary)",
                }}
              >
                {ageDisplay}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-6"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-normal)",
            fontSize: "var(--text-label)",
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          Only to make sure you're old enough to use Reclip.
        </motion.p>
      </div>

      <ContinueButton enabled={canContinue} onClick={handleContinue} />
    </StepWrapper>
  );
}

// ─── Country code selector data ───
const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", country: "United States" },
  { code: "+44", flag: "🇬🇧", country: "United Kingdom" },
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+81", flag: "🇯🇵", country: "Japan" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
  { code: "+33", flag: "🇫🇷", country: "France" },
  { code: "+55", flag: "🇧🇷", country: "Brazil" },
  { code: "+82", flag: "🇰🇷", country: "South Korea" },
  { code: "+52", flag: "🇲🇽", country: "Mexico" },
];

// ─── Step 3: Phone Number ───
function PhoneStep({
  phone,
  countryCode,
  onPhoneChange,
  onCountryCodeChange,
  onContinue,
  onBack,
}: {
  phone: string;
  countryCode: string;
  onPhoneChange: (v: string) => void;
  onCountryCodeChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const digits = phone.replace(/\D/g, "");
  const phoneError = validatePhone(digits, countryCode);
  const canContinue = !phoneError;

  // Clear error when user types
  useEffect(() => {
    if (canContinue) {
      setError(null);
    }
  }, [canContinue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
    onPhoneChange(raw);
    setAttempted(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (canContinue) {
        onContinue();
      } else {
        setAttempted(true);
        setError(phoneError);
      }
    }
  };

  const handleContinue = () => {
    if (canContinue) {
      onContinue();
    } else {
      setAttempted(true);
      setError(phoneError);
    }
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  // Format phone for display
  const displayPhone = digits
    ? digits.length > 6
      ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`
      : digits.length > 3
        ? `(${digits.slice(0, 3)}) ${digits.slice(3)}`
        : digits
    : "";

  return (
    <StepWrapper stepKey="phone">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-semi-bold)",
          fontSize: "var(--text-base)",
          color: "var(--foreground)",
          lineHeight: 1.5,
        }}
      >
        What's your phone number?
      </motion.p>

      <div className="flex-1 flex flex-col items-center justify-start">
        {/* Country code pill — above the number, center-aligned */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 px-4 py-2 mb-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--radius-button)",
            border: "1px solid rgba(155, 155, 155, 0.15)",
          }}
        >
          <span style={{ fontSize: "18px" }}>{selectedCountry.flag}</span>
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontWeight: "var(--font-weight-semi-bold)",
              fontSize: "var(--text-label)",
              color: "var(--foreground)",
            }}
          >
            {selectedCountry.code}
          </span>
          <ChevronDown size={14} color="var(--muted)" />
        </button>

        {/* Phone number display — full width, centered */}
        <div
          className="relative w-full cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="tel"
            className="absolute opacity-0 w-0 h-0"
          />
          <div className="flex items-baseline justify-center">
            <span
              style={{
                fontFamily: "var(--font-druk-cy)",
                fontWeight: "var(--font-weight-heavy)",
                fontSize: displayPhone ? "var(--text-entry)" : "var(--text-h3)",
                lineHeight: 1.2,
                letterSpacing: "0.04em",
                color: displayPhone
                  ? error && attempted
                    ? "var(--destructive)"
                    : "var(--foreground)"
                  : "var(--muted)",
                opacity: displayPhone ? 1 : 0.35,
                transition: "font-size 0.3s, color 0.3s",
              }}
            >
              {displayPhone || "Your phone"}
            </span>
            <BlinkingCursor />
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && attempted && <ErrorPill key="phone-error" message={error} />}
        </AnimatePresence>

        {/* Country picker dropdown */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full mt-4 overflow-hidden"
              style={{
                backgroundColor: "rgba(44, 44, 46, 0.95)",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(155, 155, 155, 0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="max-h-48 overflow-y-auto">
                {COUNTRY_CODES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      Haptics.selection();
                      onCountryCodeChange(c.code);
                      setShowPicker(false);
                      setAttempted(false);
                      setError(null);
                      inputRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
                    style={{
                      borderBottom: "0.5px solid rgba(84, 84, 88, 0.4)",
                      backgroundColor:
                        c.code === countryCode ? "rgba(218, 252, 121, 0.06)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: "var(--text-label)",
                        fontWeight: "var(--font-weight-normal)",
                        color: "var(--foreground)",
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      {c.country}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-sf-pro)",
                        fontSize: "var(--text-caption)",
                        fontWeight: "var(--font-weight-normal)",
                        color: "var(--muted)",
                      }}
                    >
                      {c.code}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Legal text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-6"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-normal)",
            fontSize: "var(--text-caption)",
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          By tapping "Continue", you agree to our{" "}
          <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-semi-bold)" }}>
            Privacy Policy
          </span>{" "}
          and{" "}
          <span style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-semi-bold)" }}>
            Terms of Service
          </span>
          .
        </motion.p>
      </div>

      <ContinueButton enabled={canContinue} onClick={handleContinue} />
    </StepWrapper>
  );
}

// ─── OTP speed options for demo ───
type OtpSpeed = "normal" | "fast" | "instant";
const OTP_DELAYS: Record<OtpSpeed, { wait: number; digitGap: number }> = {
  normal: { wait: 2200, digitGap: 150 },
  fast: { wait: 800, digitGap: 60 },
  instant: { wait: 300, digitGap: 20 },
};

// ─── Step 4: OTP Verification ───
function OtpStep({
  phone,
  countryCode,
  onComplete,
  onBack,
}: {
  phone: string;
  countryCode: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [autoFilling, setAutoFilling] = useState(false);
  const [verified, setVerified] = useState(false);
  const [speed, setSpeed] = useState<OtpSpeed>("normal");
  const [hasStartedFill, setHasStartedFill] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const digitTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const MOCK_OTP = "847293";

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Simulate OTP autofill
  const startAutoFill = useCallback(() => {
    // Clean up any existing timeouts
    if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current);
    digitTimeoutsRef.current.forEach(clearTimeout);
    digitTimeoutsRef.current = [];

    setHasStartedFill(true);
    const { wait, digitGap } = OTP_DELAYS[speed];

    fillTimeoutRef.current = setTimeout(() => {
      setAutoFilling(true);
      // Fill digits one by one
      MOCK_OTP.split("").forEach((digit, i) => {
        const t = setTimeout(() => {
          Haptics.rigid();
          setOtp((prev) => {
            const next = [...prev];
            next[i] = digit;
            return next;
          });
        }, i * digitGap);
        digitTimeoutsRef.current.push(t);
      });

      // After all digits filled, verify
      const verifyT = setTimeout(() => {
        setAutoFilling(false);
        setVerified(true);
        Haptics.success();
        setTimeout(onComplete, 800);
      }, MOCK_OTP.length * digitGap + 500);
      digitTimeoutsRef.current.push(verifyT);
    }, wait);
  }, [speed, onComplete]);

  // Start autofill on mount
  useEffect(() => {
    startAutoFill();
    return () => {
      if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current);
      digitTimeoutsRef.current.forEach(clearTimeout);
    };
  }, [startAutoFill]);

  // Focus first input
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleInput = (index: number, value: string) => {
    if (autoFilling || verified) return;
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (autoFilling || verified) return;
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
  };

  // Change speed
  const handleSpeedChange = (newSpeed: OtpSpeed) => {
    if (verified) return;
    Haptics.selection();
    // Reset everything
    if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current);
    digitTimeoutsRef.current.forEach(clearTimeout);
    digitTimeoutsRef.current = [];

    setOtp(["", "", "", "", "", ""]);
    setAutoFilling(false);
    setVerified(false);
    setHasStartedFill(false);
    setSpeed(newSpeed);
  };

  const digits = phone.replace(/\D/g, "");
  const maskedPhone =
    digits.length > 4
      ? `${countryCode} ${"•".repeat(digits.length - 4)}${digits.slice(-4)}`
      : `${countryCode} ${digits}`;

  const handleResend = () => {
    if (resendTimer > 0 || verified) return;
    Haptics.light();
    // Reset and restart
    if (fillTimeoutRef.current) clearTimeout(fillTimeoutRef.current);
    digitTimeoutsRef.current.forEach(clearTimeout);
    digitTimeoutsRef.current = [];

    setOtp(["", "", "", "", "", ""]);
    setAutoFilling(false);
    setVerified(false);
    setHasStartedFill(false);
    setResendTimer(30);

    // Restart after a tick
    setTimeout(() => startAutoFill(), 50);
  };

  return (
    <StepWrapper stepKey="otp">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-1"
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-semi-bold)",
          fontSize: "var(--text-base)",
          color: "var(--foreground)",
          lineHeight: 1.5,
        }}
      >
        Enter the code we sent to
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
        style={{
          fontFamily: "var(--font-sf-pro)",
          fontWeight: "var(--font-weight-normal)",
          fontSize: "var(--text-label)",
          color: "var(--muted)",
          lineHeight: 1.5,
        }}
      >
        {maskedPhone}
      </motion.p>

      <div className="flex-1 flex flex-col items-center justify-start">
        {/* OTP boxes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="flex items-center justify-center gap-2.5 w-full"
        >
          {otp.map((digit, i) => (
            <motion.div
              key={i}
              animate={
                autoFilling && digit
                  ? {
                      scale: [1, 1.15, 1],
                      borderColor: [
                        "rgba(155, 155, 155, 0.2)",
                        "var(--primary)",
                        "var(--primary)",
                      ],
                    }
                  : verified
                    ? { borderColor: "var(--primary)" }
                    : {}
              }
              transition={{ duration: 0.3 }}
              className="relative"
              style={{
                width: "clamp(42px, 12vw, 52px)",
                height: "clamp(54px, 15vw, 68px)",
                borderRadius: "var(--radius)",
                border: digit
                  ? "1.5px solid var(--primary)"
                  : "1.5px solid rgba(155, 155, 155, 0.2)",
                backgroundColor: digit
                  ? "rgba(218, 252, 121, 0.05)"
                  : "rgba(255, 255, 255, 0.04)",
                transition: "border-color 0.3s, background-color 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                readOnly={autoFilling || verified}
                className="absolute inset-0 w-full h-full text-center bg-transparent outline-none"
                style={{
                  fontFamily: "var(--font-druk-cy)",
                  fontWeight: "var(--font-weight-heavy)",
                  fontSize: "var(--text-h4)",
                  color: "var(--foreground)",
                  caretColor: "var(--accent)",
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Autofill simulation banner */}
        <AnimatePresence>
          {autoFilling && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6 flex items-center gap-2 px-4 py-2.5"
              style={{
                backgroundColor: "rgba(44, 44, 46, 0.9)",
                borderRadius: "var(--radius)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155, 155, 155, 0.12)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect width="18" height="18" rx="4" fill="rgba(0, 200, 255, 0.15)" />
                <path
                  d="M5 6h8M5 9h5M5 12h7"
                  stroke="var(--accent)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-sf-pro)",
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--foreground)",
                }}
              >
                From Messages — code: {MOCK_OTP}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verified state */}
        <AnimatePresence>
          {verified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mt-8 flex items-center gap-2"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7.5L5.5 10L11 4"
                    stroke="var(--primary-foreground)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              <span
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: "var(--font-weight-semi-bold)",
                  fontSize: "var(--text-base)",
                  color: "var(--primary)",
                }}
              >
                Verified!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Demo speed selector */}
        {!verified && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-col items-center gap-3 mb-4"
          >
            <span
              style={{
                fontFamily: "var(--font-sf-pro)",
                fontSize: "11px",
                fontWeight: "var(--font-weight-semi-bold)",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.6,
              }}
            >
              Demo speed
            </span>
            <div
              className="flex items-center gap-1 p-1"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderRadius: "var(--radius-button)",
                border: "1px solid rgba(155, 155, 155, 0.08)",
              }}
            >
              {(["normal", "fast", "instant"] as OtpSpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className="px-3.5 py-1.5"
                  style={{
                    borderRadius: "var(--radius-button)",
                    backgroundColor:
                      speed === s ? "rgba(218, 252, 121, 0.15)" : "transparent",
                    fontFamily: "var(--font-sf-pro)",
                    fontSize: "var(--text-caption)",
                    fontWeight:
                      speed === s
                        ? "var(--font-weight-semi-bold)"
                        : "var(--font-weight-normal)",
                    color: speed === s ? "var(--primary)" : "var(--muted)",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Resend */}
        {!verified && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mb-6"
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "var(--text-label)",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            Didn't get it?{" "}
            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              style={{
                color: resendTimer > 0 ? "var(--muted)" : "var(--accent)",
                fontWeight: "var(--font-weight-semi-bold)",
                fontFamily: "var(--font-inter)",
                fontSize: "var(--text-label)",
                opacity: resendTimer > 0 ? 0.5 : 1,
                cursor: resendTimer > 0 ? "default" : "pointer",
              }}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
            </button>
          </motion.p>
        )}
      </div>
    </StepWrapper>
  );
}

// ─── Username validation helper ───
function validateUsername(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be 20 characters or less";
  if (!/^[a-zA-Z0-9._]+$/.test(username)) return "Only letters, numbers, periods, and underscores";
  if (/^[._]/.test(username) || /[._]$/.test(username)) return "Can't start or end with . or _";
  if (/[.]{2}|[_]{2}|[._][._]/.test(username)) return "No consecutive special characters";
  return null;
}

// ─── Step 5: Username ───
function UsernameStep({
  firstName,
  lastName,
  onComplete,
  onBack,
}: {
  firstName: string;
  lastName: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Username starts empty — user types their own

  // Simulate availability check with debounce
  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    const validationError = username.length > 0 ? validateUsername(username) : null;
    setError(validationError);

    if (!validationError && username.length >= 3) {
      setChecking(true);
      setIsAvailable(null);
      checkTimeoutRef.current = setTimeout(() => {
        // Simulate: most usernames are available, some "taken" ones for demo
        const takenNames = ["admin", "reclip", "test", "user"];
        const available = !takenNames.includes(username.toLowerCase());
        setIsAvailable(available);
        setChecking(false);
        if (!available) {
          setError("Username is already taken");
        }
      }, 600);
    } else {
      setIsAvailable(null);
      setChecking(false);
    }

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username]);

  const canContinue = username.length >= 3 && !error && isAvailable === true;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 20);
    setUsername(raw);
    setAttempted(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (canContinue) {
        onComplete();
      } else {
        setAttempted(true);
      }
    }
  };

  const handleContinue = () => {
    if (canContinue) {
      onComplete();
    } else {
      setAttempted(true);
      if (username.length > 0 && !error) {
        setError(validateUsername(username) || "Username is not available");
      }
    }
  };

  return (
    <StepWrapper stepKey="username">
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-2"
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: "var(--font-weight-semi-bold)",
          fontSize: "var(--text-base)",
          color: "var(--foreground)",
          lineHeight: 1.5,
        }}
      >
        Next, create your username
      </motion.p>

      <div className="flex-1 flex flex-col items-center justify-start pt-4">
        {/* Hidden real input */}
        <div
          className="relative w-full cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            className="absolute opacity-0 w-0 h-0"
          />
          <div className="flex items-baseline justify-center">
            <span
              style={{
                fontFamily: "var(--font-druk-cy)",
                fontWeight: "var(--font-weight-heavy)",
                fontSize: username ? "var(--text-entry)" : "var(--text-h3)",
                lineHeight: 1.2,
                color: username
                  ? error && (attempted || isAvailable === false)
                    ? "var(--destructive)"
                    : "var(--foreground)"
                  : "var(--muted)",
                opacity: username ? 1 : 0.35,
                transition: "font-size 0.3s, color 0.3s",
              }}
            >
              {username || "Your username"}
            </span>
            <BlinkingCursor />
          </div>
        </div>

        {/* Status indicators */}
        <AnimatePresence mode="wait">
          {error && (attempted || isAvailable === false) ? (
            <ErrorPill key="username-error" message={error} />
          ) : checking ? (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3.5 h-3.5 rounded-full"
                style={{
                  border: "2px solid rgba(155, 155, 155, 0.2)",
                  borderTopColor: "var(--accent)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sf-pro)",
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--muted)",
                }}
              >
                Checking availability...
              </span>
            </motion.div>
          ) : isAvailable === true ? (
            <motion.div
              key="available"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5"
              style={{
                backgroundColor: "rgba(218, 252, 121, 0.1)",
                borderRadius: "var(--radius-button)",
                border: "1px solid rgba(218, 252, 121, 0.2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7.5L5.5 10L11 4"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-sf-pro)",
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-semi-bold)",
                  color: "var(--primary)",
                }}
              >
                Username is available
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Helper text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-6"
        >
          <p
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "var(--text-label)",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            Your username is unique.
          </p>
          <p
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "var(--text-label)",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            You can always change it later.
          </p>
        </motion.div>
      </div>

      <ContinueButton enabled={canContinue} onClick={handleContinue} />
    </StepWrapper>
  );
}

// ═══════════════════════════════════════════
// ─── Main Onboarding Component ───
// ═══════════════════════════════════════════
export function ScreenOnboarding({ onComplete }: ScreenOnboardingProps) {
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");

  const goAge = useCallback(() => setStep("age"), []);
  const goPhone = useCallback(() => setStep("phone"), []);
  const goOtp = useCallback(() => setStep("otp"), []);
  const goUsername = useCallback(() => setStep("username"), []);

  // Back navigation
  const goBack = useCallback(() => {
    setStep((current) => {
      switch (current) {
        case "age":
          return "name";
        case "phone":
          return "age";
        case "otp":
          return "phone";
        case "username":
          return "otp";
        default:
          return current;
      }
    });
  }, []);

  // Progress dots
  const steps: Step[] = ["name", "age", "phone", "otp", "username"];
  const currentIndex = steps.indexOf(step);

  return (
    <div
      className="flex flex-col items-center h-full w-full"
      style={{
        backgroundColor: "var(--background)",
        paddingTop: "var(--page-pt)",
        paddingBottom: "var(--page-pb)",
        paddingLeft: "var(--page-px)",
        paddingRight: "var(--page-px)",
      }}
    >
      <div
        className="flex flex-col h-full w-full mx-auto"
        style={{ maxWidth: "var(--page-max-w)" }}
      >
        {/* Top bar: Back + Brand + Spacer */}
        <div className="relative flex items-center justify-center mb-2 min-h-[32px]">
          {/* Back button - shown on steps after name */}
          <AnimatePresence>
            {step !== "name" && <BackButton onClick={goBack} />}
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s}
              animate={{
                width: i === currentIndex ? 24 : 6,
                backgroundColor:
                  i <= currentIndex
                    ? "var(--primary)"
                    : "rgba(155, 155, 155, 0.25)",
              }}
              transition={{ duration: 0.35 }}
              className="h-1.5 rounded-full"
            />
          ))}
        </motion.div>

        {/* Step content */}
        {step === "name" && (
          <NameStep
            firstName={firstName}
            lastName={lastName}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onContinue={goAge}
          />
        )}

        {step === "age" && (
          <AgeStep
            firstName={firstName}
            birthday={birthday}
            onBirthdayChange={setBirthday}
            onContinue={goPhone}
            onBack={goBack}
          />
        )}

        {step === "phone" && (
          <PhoneStep
            phone={phone}
            countryCode={countryCode}
            onPhoneChange={setPhone}
            onCountryCodeChange={setCountryCode}
            onContinue={goOtp}
            onBack={goBack}
          />
        )}

        {step === "otp" && (
          <OtpStep
            phone={phone}
            countryCode={countryCode}
            onComplete={goUsername}
            onBack={goBack}
          />
        )}

        {step === "username" && (
          <UsernameStep
            firstName={firstName}
            lastName={lastName}
            onComplete={onComplete}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}