// ToastView.swift
// ReclipApp
//
// Transient toast notification that slides down from the top of the screen.

import SwiftUI

// MARK: - ToastView

/// A floating toast notification anchored to the top of the screen.
///
/// - Slides in from y = -60 and settles at y = 0.
/// - Auto-dismisses after 2 500 ms.
/// - Uses a blur-backed capsule with a lime-green checkmark icon on the left.
struct ToastView: View {

    // MARK: Parameters

    @Binding var isShowing: Bool
    let message: String

    // MARK: Constants

    private let autoDismissDelay: Double = 2.5

    // MARK: Private State

    @State private var offset: CGFloat = -60
    @State private var opacity: Double = 0

    // MARK: Body

    var body: some View {
        VStack {
            if isShowing {
                toastContent
                    .offset(y: offset)
                    .opacity(opacity)
                    .onAppear {
                        animateIn()
                        scheduleAutoDismiss()
                    }
            }
            Spacer()
        }
        .animation(.easeInOut(duration: 0.3), value: isShowing)
    }

    // MARK: Content

    private var toastContent: some View {
        HStack(spacing: 10) {
            // Checkmark icon
            ZStack {
                Circle()
                    .fill(Theme.Colors.brand)
                    .frame(width: 20, height: 20)

                Image(systemName: "checkmark")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.black)
            }

            Text(message)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.10))
                .background(
                    Capsule()
                        .fill(Color(white: 0.10))
                )
                .overlay(
                    Capsule()
                        .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.40), radius: 12, x: 0, y: 4)
        .padding(.horizontal, 24)
        .padding(.top, 16)
    }

    // MARK: Animation

    private func animateIn() {
        withAnimation(Theme.Springs.modalEntrance) {
            offset  = 0
            opacity = 1
        }
    }

    private func animateOut(completion: @escaping () -> Void) {
        withAnimation(.easeIn(duration: 0.25)) {
            offset  = -60
            opacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            completion()
        }
    }

    private func scheduleAutoDismiss() {
        DispatchQueue.main.asyncAfter(deadline: .now() + autoDismissDelay) {
            guard isShowing else { return }
            animateOut {
                isShowing = false
                offset    = -60
                opacity   = 0
            }
        }
    }
}

// MARK: - ToastModifier

/// View modifier that overlays a `ToastView` at the top of any view.
struct ToastModifier: ViewModifier {
    @Binding var isShowing: Bool
    let message: String

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content
            ToastView(isShowing: $isShowing, message: message)
        }
    }
}

extension View {
    /// Attach a toast notification to this view hierarchy.
    func toast(isShowing: Binding<Bool>, message: String) -> some View {
        modifier(ToastModifier(isShowing: isShowing, message: message))
    }
}

// MARK: - Previews

#if DEBUG
struct ToastView_Previews: PreviewProvider {
    struct PreviewWrapper: View {
        @State private var showing = false

        var body: some View {
            ZStack {
                Color.black.ignoresSafeArea()

                Button("Show Toast") { showing = true }
                    .foregroundColor(Theme.Colors.brand)
            }
            .toast(isShowing: $showing, message: "Clip saved successfully")
        }
    }

    static var previews: some View {
        PreviewWrapper()
    }
}
#endif
