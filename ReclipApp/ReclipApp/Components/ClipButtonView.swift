import SwiftUI

/// Primary action clip button with animated glowing ring
struct ClipButtonView: View {
    var label: String = "Clip"
    var isRecording: Bool = false
    var action: () -> Void

    @State private var ringScale: CGFloat = 1.0
    @State private var ringOpacity: Double = 0.7
    @State private var buttonScale: CGFloat = 1.0

    private let accentColor = Color(hex: "#DAFC79")
    private let buttonSize: CGFloat = 80

    var body: some View {
        Button(action: {
            HapticsManager.shared.medium()
            withAnimation(.spring(response: 0.15, dampingFraction: 0.6)) {
                buttonScale = 0.92
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    buttonScale = 1.0
                }
            }
            action()
        }) {
            ZStack {
                // Pulsing outer ring
                Circle()
                    .stroke(accentColor.opacity(ringOpacity * (isRecording ? 1 : 0.5)), lineWidth: 2)
                    .frame(width: buttonSize + 24, height: buttonSize + 24)
                    .scaleEffect(ringScale)

                // Second ring
                Circle()
                    .stroke(accentColor.opacity(0.15), lineWidth: 1)
                    .frame(width: buttonSize + 48, height: buttonSize + 48)

                // Main button
                Circle()
                    .fill(accentColor)
                    .frame(width: buttonSize, height: buttonSize)
                    .overlay(
                        Text(label)
                            .font(.system(size: 16, weight: .black, design: .default))
                            .foregroundColor(.black)
                    )
                    .shadow(color: accentColor.opacity(0.5), radius: isRecording ? 20 : 8)
            }
        }
        .scaleEffect(buttonScale)
        .onAppear { startPulse() }
        .onChange(of: isRecording) { _ in startPulse() }
    }

    private func startPulse() {
        let duration = isRecording ? 0.8 : 1.5
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
            ringScale = 1.1
            ringOpacity = isRecording ? 1.0 : 0.4
        }
    }
}

/// Secondary action button
struct SecondaryButton: View {
    var label: String
    var systemImage: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: { HapticsManager.shared.light(); action() }) {
            HStack(spacing: 6) {
                if let icon = systemImage {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(label)
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(Color.white.opacity(0.12))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 1))
        }
    }
}

/// Primary lime-colored CTA button
struct PrimaryButton: View {
    var label: String
    var systemImage: String? = nil
    var isLoading: Bool = false
    var action: () -> Void

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        Button(action: { HapticsManager.shared.medium(); action() }) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.black).scaleEffect(0.8)
                } else {
                    if let icon = systemImage {
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .bold))
                    }
                    Text(label)
                        .font(.system(size: 17, weight: .bold))
                }
            }
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(accentColor)
            .clipShape(Capsule())
        }
        .disabled(isLoading)
    }
}
