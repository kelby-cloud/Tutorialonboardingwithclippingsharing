// ContinueButton.swift
// ReclipApp
//
// Primary CTA pill button with optional timed fill animation,
// press-scale haptic feedback.

import SwiftUI

// MARK: - ContinueButton

/// A pill-shaped continue / action button.
///
/// States:
/// - **Enabled + filled**: lime-green background, black text. `.medium` haptic on tap.
/// - **Disabled**: transparent bg, gray border, gray text at 50 % opacity. `.warning` haptic on tap.
///
/// Fill animation:
/// On appearance the button shows only a lime-green outline (0.35 alpha border).
/// After `fillDelay` seconds (default 3.0) it transitions to the solid filled state.
/// Setting `fillDelay` to `0` makes it appear filled immediately.
struct ContinueButton: View {

    // MARK: Parameters

    /// Button label string.
    let label: String

    /// Whether the button is interactive.
    var enabled: Bool = true

    /// Seconds to wait before the button auto-fills.  Default is 3.0.
    var fillDelay: Double = 3.0

    /// Tap handler — called only when `enabled` is `true`.
    let action: () -> Void

    // MARK: Private State

    /// Tracks whether the timed fill animation has fired.
    @State private var isFilled: Bool = false
    /// Tracks the press-down scale state.
    @State private var isPressed: Bool = false

    // MARK: Derived

    private var showFilled: Bool { isFilled && enabled }

    // MARK: Body

    var body: some View {
        Button {
            handleTap()
        } label: {
            HStack(spacing: 8) {
                Text(label)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(showFilled ? .black : Theme.Colors.muted.opacity(0.5))

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(showFilled ? .black : Theme.Colors.muted.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 58)
            .background(
                Capsule()
                    .fill(showFilled ? Theme.Colors.brand : Color.clear)
            )
            .overlay(
                Capsule()
                    .strokeBorder(
                        showFilled
                            ? Color.clear
                            : (enabled
                               ? Theme.Colors.brand.opacity(0.35)
                               : Theme.Colors.muted.opacity(0.2)),
                        lineWidth: 1.5
                    )
            )
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.96 : 1.0)
        .animation(Theme.Springs.buttonPress, value: isPressed)
        .animation(.easeInOut(duration: 0.5), value: showFilled)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    withAnimation(Theme.Springs.buttonPress) { isPressed = true }
                }
                .onEnded { _ in
                    withAnimation(Theme.Springs.buttonPress) { isPressed = false }
                }
        )
        .onAppear {
            if fillDelay <= 0 {
                isFilled = true
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + fillDelay) {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        isFilled = true
                    }
                }
            }
        }
        .onChange(of: enabled) { newValue in
            if !newValue { isFilled = false }
        }
    }

    // MARK: Tap Logic

    private func handleTap() {
        if enabled {
            HapticsManager.shared.medium()
            action()
        } else {
            HapticsManager.shared.warning()
        }
    }
}

// MARK: - Previews

#if DEBUG
struct ContinueButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            // Immediate fill
            ContinueButton(label: "Continue",
                           enabled: true,
                           fillDelay: 0,
                           action: {})

            // Disabled
            ContinueButton(label: "Continue",
                           enabled: false,
                           fillDelay: 0,
                           action: {})

            // Auto-fill after 3 s (starts as outline)
            ContinueButton(label: "Get Started",
                           enabled: true,
                           fillDelay: 3.0,
                           action: {})
        }
        .padding(24)
        .background(Color.black)
        .previewLayout(.sizeThatFits)
    }
}
#endif
