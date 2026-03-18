// HapticsManager.swift
// ReclipApp
//
// Centralised haptic feedback following the HapticPatterns spec.

import UIKit

// MARK: - HapticsManager

/// Provides a single call-site for every haptic pattern used in the app.
///
/// Each method lazily creates (and re-uses) its generator so the system
/// can pre-warm them for minimal latency.
final class HapticsManager {

    // MARK: Singleton

    static let shared = HapticsManager()
    private init() {}

    // MARK: Private Generators (lazily initialised)

    private lazy var selectionGenerator: UISelectionFeedbackGenerator = {
        let g = UISelectionFeedbackGenerator()
        g.prepare()
        return g
    }()

    private lazy var lightGenerator: UIImpactFeedbackGenerator = {
        let g = UIImpactFeedbackGenerator(style: .light)
        g.prepare()
        return g
    }()

    private lazy var mediumGenerator: UIImpactFeedbackGenerator = {
        let g = UIImpactFeedbackGenerator(style: .medium)
        g.prepare()
        return g
    }()

    private lazy var heavyGenerator: UIImpactFeedbackGenerator = {
        let g = UIImpactFeedbackGenerator(style: .heavy)
        g.prepare()
        return g
    }()

    private lazy var rigidGenerator: UIImpactFeedbackGenerator = {
        let g = UIImpactFeedbackGenerator(style: .rigid)
        g.prepare()
        return g
    }()

    private lazy var notificationGenerator: UINotificationFeedbackGenerator = {
        let g = UINotificationFeedbackGenerator()
        g.prepare()
        return g
    }()

    // MARK: - Public API

    // ── Selection ──────────────────────────────────────────────────────────────

    /// Selection-changed feedback — ideal for picker / segmented control moves.
    func selection() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }

    // ── Impact ─────────────────────────────────────────────────────────────────

    /// Light impact — subtle taps, small UI interactions.
    func light() {
        lightGenerator.impactOccurred()
        lightGenerator.prepare()
    }

    /// Medium impact — standard button taps.
    func medium() {
        mediumGenerator.impactOccurred()
        mediumGenerator.prepare()
    }

    /// Heavy impact — destructive actions, hard confirmations.
    func heavy() {
        heavyGenerator.impactOccurred()
        heavyGenerator.prepare()
    }

    /// Rigid impact — crisp, stiff feedback (iOS 13+).
    func rigid() {
        rigidGenerator.impactOccurred()
        rigidGenerator.prepare()
    }

    // ── Notification ───────────────────────────────────────────────────────────

    /// Success notification — task complete, positive confirmation.
    func success() {
        notificationGenerator.notificationOccurred(.success)
        notificationGenerator.prepare()
    }

    /// Warning notification — non-fatal issue, caution prompt.
    func warning() {
        notificationGenerator.notificationOccurred(.warning)
        notificationGenerator.prepare()
    }

    /// Error notification — failed action, destructive alert.
    func error() {
        notificationGenerator.notificationOccurred(.error)
        notificationGenerator.prepare()
    }
}
