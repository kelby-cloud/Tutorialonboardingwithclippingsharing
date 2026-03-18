// ProgressDots.swift
// ReclipApp
//
// Animated step-indicator dots for multi-page onboarding flows.

import SwiftUI

// MARK: - ProgressDots

/// A row of pill-shaped dots indicating progress through a multi-step flow.
///
/// - Active dot: lime-green, 28 pt wide × 8 pt tall capsule.
/// - Inactive dots: muted gray at 30 % opacity, 8 × 8 pt capsule.
/// - Gap: 10 pt between dots.
/// - State changes animate with a spring.
struct ProgressDots: View {

    // MARK: Parameters

    /// Total number of steps / dots.
    let count: Int

    /// Zero-based index of the currently active step.
    let current: Int

    /// Callback fired with the tapped dot index.
    let onTap: (Int) -> Void

    // MARK: Constants

    private let activeWidth:   CGFloat = 28
    private let inactiveWidth: CGFloat = 8
    private let dotHeight:     CGFloat = 8
    private let spacing:       CGFloat = 10

    // MARK: Body

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0 ..< count, id: \.self) { index in
                dotView(for: index)
                    .onTapGesture { onTap(index) }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Step \(current + 1) of \(count)")
    }

    // MARK: Dot Builder

    @ViewBuilder
    private func dotView(for index: Int) -> some View {
        let isActive = index == current

        Capsule()
            .fill(isActive
                  ? Theme.Colors.brand
                  : Theme.Colors.muted.opacity(0.30))
            .frame(
                width:  isActive ? activeWidth : inactiveWidth,
                height: dotHeight
            )
            .animation(Theme.Springs.cardEntrance, value: current)
    }
}

// MARK: - Previews

#if DEBUG
struct ProgressDots_Previews: PreviewProvider {
    struct PreviewWrapper: View {
        @State private var step = 0
        private let total = 5

        var body: some View {
            VStack(spacing: 32) {
                ProgressDots(count: total,
                             current: step,
                             onTap: { step = $0 })

                HStack(spacing: 16) {
                    Button("Prev") { if step > 0 { step -= 1 } }
                    Button("Next") { if step < total - 1 { step += 1 } }
                }
                .foregroundColor(Theme.Colors.brand)
            }
            .padding()
            .background(Color.black)
        }
    }

    static var previews: some View {
        PreviewWrapper()
            .previewLayout(.sizeThatFits)
    }
}
#endif
