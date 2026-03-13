import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ChevronRight,
  Check,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Haptics } from "../../utils/haptics";

interface Screen5Props {
  onInvite: () => void;
  onSkip: () => void;
}

interface Contact {
  id: string;
  name: string;
  handle?: string;
  photo: string;
  onReclip: boolean;
}

const MAX_BEST_FRIENDS = 3;

const allContacts: Contact[] = [
  {
    id: "1",
    name: "Ava Martinez",
    handle: "@ava.m",
    photo:
      "https://images.unsplash.com/photo-1699426858164-7249586cb489?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: true,
  },
  {
    id: "2",
    name: "Jordan Lee",
    handle: "@jlee",
    photo:
      "https://images.unsplash.com/photo-1681070909604-f555aa006564?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: true,
  },
  {
    id: "3",
    name: "Destiny Brown",
    handle: "@des.b",
    photo:
      "https://images.unsplash.com/photo-1682478695074-9e47f09a7459?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: true,
  },
  {
    id: "4",
    name: "Kai Nguyen",
    handle: "@kai.n",
    photo:
      "https://images.unsplash.com/photo-1643990081713-6d747510bf2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: true,
  },
  {
    id: "5",
    name: "Sophie Chen",
    handle: "@soph",
    photo:
      "https://images.unsplash.com/photo-1662695089339-a2c24231a3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: true,
  },
  {
    id: "6",
    name: "Marcus Taylor",
    photo:
      "https://images.unsplash.com/photo-1761615593325-8a6f1c3fd3c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: false,
  },
  {
    id: "7",
    name: "Ella Rivera",
    photo:
      "https://images.unsplash.com/photo-1725375176342-b317caad2a68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: false,
  },
  {
    id: "8",
    name: "Noah Kim",
    photo:
      "https://images.unsplash.com/photo-1763654891727-d5cf0f7b67cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80",
    onReclip: false,
  },
];

// ─── iOS-style Permission Modal ───
function ContactsPermissionModal({
  onAllow,
  onDeny,
}: {
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="w-[280px] overflow-hidden"
        style={{
          backgroundColor: "rgba(44, 44, 46, 0.97)",
          borderRadius: "14px",
          backdropFilter: "blur(40px)",
        }}
      >
        {/* Modal body */}
        <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
          {/* App icon */}
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-1"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
          >
            <Users size={26} color="var(--primary-foreground)" />
          </div>

          <p
            className="text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontWeight: "var(--font-weight-semi-bold)",
              fontSize: "17px",
              lineHeight: 1.3,
            }}
          >
            "Reclip" Would Like to Access Your Contacts
          </p>
          <p
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "13px",
              lineHeight: 1.4,
              color: "rgba(235, 235, 245, 0.6)",
            }}
          >
            This lets you find friends who are already on Reclip and send clips directly to them.
          </p>
        </div>

        {/* Buttons */}
        <div
          style={{
            borderTop: "0.5px solid rgba(84, 84, 88, 0.65)",
          }}
        >
          <button
            onClick={onDeny}
            className="w-full py-3 text-center"
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "17px",
              color: "rgba(10, 132, 255, 1)",
              borderBottom: "0.5px solid rgba(84, 84, 88, 0.65)",
            }}
          >
            Don't Allow
          </button>
          <button
            onClick={onAllow}
            className="w-full py-3 text-center"
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontWeight: "var(--font-weight-semi-bold)",
              fontSize: "17px",
              color: "rgba(10, 132, 255, 1)",
            }}
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Contact Row ───
function ContactRow({
  contact,
  isSelected,
  isFull,
  onToggle,
  delay,
}: {
  contact: Contact;
  isSelected: boolean;
  isFull: boolean;
  onToggle: (id: string) => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onToggle(contact.id)}
      className="w-full flex items-center gap-3 px-4 py-3"
      style={{
        borderRadius: "var(--radius)",
        backgroundColor: isSelected
          ? "rgba(218, 252, 121, 0.08)"
          : "rgba(255, 255, 255, 0.03)",
        border: isSelected
          ? "1px solid rgba(218, 252, 121, 0.25)"
          : "1px solid rgba(155, 155, 155, 0.08)",
        opacity: !isSelected && isFull ? 0.4 : 1,
        transition:
          "background-color 0.25s, border-color 0.25s, opacity 0.25s",
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-12 h-12 rounded-full overflow-hidden"
          style={{
            border: isSelected
              ? "2px solid var(--primary)"
              : "2px solid transparent",
            transition: "border-color 0.25s",
          }}
        >
          <img
            src={contact.photo}
            alt={contact.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        </div>
        {/* Check overlay */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Check size={11} strokeWidth={3} color="var(--primary-foreground)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <p
          className="text-[var(--foreground)] truncate"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-semi-bold)",
            fontSize: "var(--text-base)",
          }}
        >
          {contact.name}
        </p>
        {contact.onReclip && contact.handle && (
          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-normal)",
              color: "var(--muted)",
            }}
          >
            {contact.handle}
          </span>
        )}
      </div>

      {/* Status badge */}
      {contact.onReclip ? (
        <span
          className="flex-shrink-0 px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: "rgba(218, 252, 121, 0.12)",
            fontFamily: "var(--font-sf-pro)",
            fontSize: "11px",
            fontWeight: "var(--font-weight-semi-bold)",
            color: "var(--primary)",
            letterSpacing: "0.02em",
          }}
        >
          On Reclip
        </span>
      ) : (
        <span
          className="flex-shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            fontFamily: "var(--font-sf-pro)",
            fontSize: "11px",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--muted)",
          }}
        >
          <UserPlus size={10} />
          Invite
        </span>
      )}
    </motion.button>
  );
}

// ─── Main Component ───
export function Screen5FriendLoop({ onInvite, onSkip }: Screen5Props) {
  const [showPermission, setShowPermission] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [buttonFilled, setButtonFilled] = useState(false);

  // Show permission modal after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setShowPermission(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Fill the continue button once 3 friends are selected
  useEffect(() => {
    if (selectedIds.length >= MAX_BEST_FRIENDS) {
      const timer = setTimeout(() => setButtonFilled(true), 400);
      return () => clearTimeout(timer);
    } else {
      setButtonFilled(false);
    }
  }, [selectedIds.length]);

  const handleAllow = useCallback(() => {
    setShowPermission(false);
    setTimeout(() => setPermissionGranted(true), 300);
  }, []);

  const handleDeny = useCallback(() => {
    setShowPermission(false);
    // Still show contacts but with a "no permission" hint, for prototype purposes show anyway
    setTimeout(() => setPermissionGranted(true), 300);
  }, []);

  const toggleFriend = useCallback((id: string) => {
    Haptics.selection();
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_BEST_FRIENDS) {
        Haptics.warning();
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const filteredContacts = allContacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into on Reclip vs invite
  const onReclipContacts = filteredContacts.filter((c) => c.onReclip);
  const inviteContacts = filteredContacts.filter((c) => !c.onReclip);

  return (
    <div
      className="flex flex-col h-full w-full"
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
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-2"
        >
          <h3
            className="text-[var(--foreground)]"
            style={{
              fontFamily: "var(--font-druk-cy)",
              fontWeight: "var(--font-weight-heavy)",
              fontSize: "var(--text-h4)",
              lineHeight: 1.2,
              textTransform: "uppercase",
            }}
          >
            Add your people
          </h3>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-5"
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: "var(--font-weight-normal)",
            fontSize: "var(--text-base)",
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          Choose up to 3 best friends to share clips with
        </motion.p>

        {/* Selected friends counter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-3 mb-5"
        >
          {/* 3 avatar slots */}
          <div className="flex items-center -space-x-2">
            {Array.from({ length: MAX_BEST_FRIENDS }).map((_, i) => {
              const selectedContact = selectedIds[i]
                ? allContacts.find((c) => c.id === selectedIds[i])
                : null;
              return (
                <motion.div
                  key={i}
                  className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    border: selectedContact
                      ? "2px solid var(--primary)"
                      : "2px dashed rgba(155, 155, 155, 0.3)",
                    backgroundColor: selectedContact
                      ? "transparent"
                      : "rgba(255, 255, 255, 0.04)",
                    transition: "border-color 0.3s, background-color 0.3s",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {selectedContact ? (
                      <motion.img
                        key={selectedContact.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        src={selectedContact.photo}
                        alt={selectedContact.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <motion.div
                        key={`empty-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                      >
                        <UserPlus size={16} color="var(--muted)" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <span
            style={{
              fontFamily: "var(--font-sf-pro)",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-semi-bold)",
              color:
                selectedIds.length >= MAX_BEST_FRIENDS
                  ? "var(--primary)"
                  : "var(--muted)",
              transition: "color 0.3s",
            }}
          >
            {selectedIds.length}/{MAX_BEST_FRIENDS}
          </span>
        </motion.div>

        {/* Search bar */}
        {permissionGranted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="relative mb-4"
          >
            <Search
              size={16}
              color="var(--muted)"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 outline-none"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderRadius: "var(--radius-button)",
                border: "1px solid rgba(155, 155, 155, 0.1)",
                fontFamily: "var(--font-inter)",
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-normal)",
                color: "var(--foreground)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={14} color="var(--muted)" />
              </button>
            )}
          </motion.div>
        )}

        {/* Contact list — scrollable */}
        <div
          className="flex-1 overflow-y-auto -mx-1 px-1"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 8px, black calc(100% - 24px), transparent)",
          }}
        >
          {permissionGranted && (
            <div className="flex flex-col gap-2 pb-4">
              {/* On Reclip section */}
              {onReclipContacts.length > 0 && (
                <>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="px-1 pt-1 pb-1"
                    style={{
                      fontFamily: "var(--font-sf-pro)",
                      fontSize: "12px",
                      fontWeight: "var(--font-weight-semi-bold)",
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Friends on Reclip
                  </motion.span>
                  {onReclipContacts.map((contact, i) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedIds.includes(contact.id)}
                      isFull={selectedIds.length >= MAX_BEST_FRIENDS}
                      onToggle={toggleFriend}
                      delay={0.2 + i * 0.06}
                    />
                  ))}
                </>
              )}

              {/* Invite section */}
              {inviteContacts.length > 0 && (
                <>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="px-1 pt-3 pb-1"
                    style={{
                      fontFamily: "var(--font-sf-pro)",
                      fontSize: "12px",
                      fontWeight: "var(--font-weight-semi-bold)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Invite to Reclip
                  </motion.span>
                  {inviteContacts.map((contact, i) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedIds.includes(contact.id)}
                      isFull={selectedIds.length >= MAX_BEST_FRIENDS}
                      onToggle={toggleFriend}
                      delay={0.55 + i * 0.06}
                    />
                  ))}
                </>
              )}

              {filteredContacts.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-normal)",
                    color: "var(--muted)",
                  }}
                >
                  No contacts found
                </motion.p>
              )}
            </div>
          )}

          {/* Before permission granted - placeholder */}
          {!permissionGranted && !showPermission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4"
            >
              <Users size={40} color="var(--muted)" style={{ opacity: 0.4 }} />
              <p
                className="text-center"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--muted)",
                }}
              >
                Waiting for contact access...
              </p>
            </motion.div>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { Haptics.medium(); onInvite(); }}
            className="w-full flex items-center justify-center gap-2 py-4 px-6"
            style={{
              borderRadius: "var(--radius-button)",
              borderWidth: 1,
              borderStyle: "solid",
              fontFamily: "var(--font-inter)",
              fontWeight: "var(--font-weight-bold)",
              fontSize: "var(--text-base)",
              backgroundColor: buttonFilled ? "var(--primary)" : "transparent",
              color: buttonFilled
                ? "var(--primary-foreground)"
                : "var(--primary)",
              borderColor: buttonFilled
                ? "transparent"
                : "rgba(218, 252, 121, 0.35)",
              transition:
                "background-color 0.6s cubic-bezier(0.4,0,0.2,1), color 0.6s cubic-bezier(0.4,0,0.2,1), border-color 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {selectedIds.length >= MAX_BEST_FRIENDS
              ? "Continue"
              : `Add ${MAX_BEST_FRIENDS - selectedIds.length} more`}
            <ChevronRight size={20} />
          </motion.button>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { Haptics.light(); onSkip(); }}
            className="w-full py-3 text-center transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: "var(--font-weight-normal)",
              fontSize: "var(--text-label)",
              color: "var(--muted)",
            }}
          >
            Skip for now
          </motion.button>
        </div>
      </div>

      {/* iOS Permission Modal */}
      <AnimatePresence>
        {showPermission && (
          <ContactsPermissionModal onAllow={handleAllow} onDeny={handleDeny} />
        )}
      </AnimatePresence>
    </div>
  );
}