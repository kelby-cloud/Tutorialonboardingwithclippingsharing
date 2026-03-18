import SwiftUI

struct DoneView: View {
    var onReplay: () -> Void

    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0
    @State private var confettiParticles: [ConfettiParticle] = []
    @State private var showConfetti = true

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if showConfetti {
                ConfettiView(particles: confettiParticles)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
            }

            VStack(spacing: 32) {
                Spacer()

                // Success icon
                ZStack {
                    Circle()
                        .fill(accentColor.opacity(0.1))
                        .frame(width: 160, height: 160)
                        .blur(radius: 20)

                    ZStack {
                        Circle()
                            .stroke(accentColor.opacity(0.4), lineWidth: 2)
                            .frame(width: 130, height: 130)

                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(accentColor)
                    }
                }
                .scaleEffect(scale)
                .opacity(opacity)

                VStack(spacing: 12) {
                    Text("You're all set! 🎊")
                        .font(.system(size: 34, weight: .black))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)

                    Text("Welcome to Reclip. Start recording your world and sharing moments that matter.")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .scaleEffect(scale)
                .opacity(opacity)

                // Stats row
                HStack(spacing: 0) {
                    statItem(value: "2 min", label: "Buffer")
                    Divider().background(Color.white.opacity(0.1)).frame(height: 40)
                    statItem(value: "∞", label: "Clips")
                    Divider().background(Color.white.opacity(0.1)).frame(height: 40)
                    statItem(value: "3", label: "Friends")
                }
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 40)
                .opacity(opacity)

                Spacer()

                VStack(spacing: 12) {
                    PrimaryButton(label: "Start Clipping", systemImage: "mic.fill") {
                        HapticsManager.shared.success()
                        onReplay()
                    }

                    Button("Take the tutorial again") {
                        HapticsManager.shared.light()
                        onReplay()
                    }
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.4))
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 50)
                .opacity(opacity)
            }
        }
        .onAppear { animate() }
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .black))
                .foregroundColor(accentColor)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
    }

    private func animate() {
        confettiParticles = (0..<60).map { _ in ConfettiParticle() }
        HapticsManager.shared.success()

        withAnimation(.spring(response: 0.7, dampingFraction: 0.6).delay(0.1)) {
            scale = 1.0
            opacity = 1.0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) {
            withAnimation { showConfetti = false }
        }
    }
}
