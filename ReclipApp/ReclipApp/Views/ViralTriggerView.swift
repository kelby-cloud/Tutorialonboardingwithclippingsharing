import SwiftUI
import UIKit

struct ViralTriggerView: View {
    var audioURL: URL?
    var onNext: () -> Void

    @StateObject private var player = AudioPlayerManager()
    @State private var showCelebration = false
    @State private var confettiParticles: [ConfettiParticle] = []
    @State private var showToast = false
    @State private var toastMessage = ""
    @State private var appearScale: CGFloat = 0.8
    @State private var appearOpacity: Double = 0

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Confetti layer
            if showCelebration {
                ConfettiView(particles: confettiParticles)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
            }

            VStack(spacing: 0) {
                Spacer()

                // Celebration icon
                ZStack {
                    // Outer glow
                    Circle()
                        .fill(accentColor.opacity(0.1))
                        .frame(width: 200, height: 200)
                        .blur(radius: 20)

                    Circle()
                        .stroke(accentColor.opacity(0.3), lineWidth: 2)
                        .frame(width: 160, height: 160)

                    Image(systemName: "bolt.fill")
                        .font(.system(size: 60, weight: .bold))
                        .foregroundColor(accentColor)
                }
                .scaleEffect(appearScale)
                .opacity(appearOpacity)
                .padding(.bottom, 32)

                // Title
                VStack(spacing: 12) {
                    Text("🎉 Clip Ready!")
                        .font(.system(size: 36, weight: .black))
                        .foregroundColor(.white)

                    Text("Your clip is ready to share with the world")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .scaleEffect(appearScale)
                .opacity(appearOpacity)

                Spacer()

                // Audio player
                if audioURL != nil {
                    audioPlayerCard
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                }

                // Action buttons
                VStack(spacing: 12) {
                    PrimaryButton(label: "Share Clip", systemImage: "square.and.arrow.up") {
                        shareClip()
                    }

                    SecondaryButton(label: "Continue", systemImage: "arrow.right") {
                        player.stop()
                        onNext()
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }

            ToastOverlay(isShowing: $showToast, message: toastMessage)
        }
        .onAppear { triggerCelebration() }
        .onDisappear { player.stop() }
    }

    private var audioPlayerCard: some View {
        HStack(spacing: 16) {
            Button(action: { player.togglePlayPause(); HapticsManager.shared.light() }) {
                ZStack {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 48, height: 48)
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.black)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                GeometryReader { geo in
                    LinearWaveformView(
                        samples: Array(repeating: Float.random(in: 0.2...0.8), count: 60),
                        progress: player.duration > 0 ? CGFloat(player.currentTime / player.duration) : 0,
                        height: 36
                    )
                }
                .frame(height: 36)

                Text(player.isPlaying
                     ? String(format: "%.1f / %.1fs", player.currentTime, player.duration)
                     : String(format: "%.1fs", player.duration))
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.4))
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.1), lineWidth: 1))
        .onAppear {
            if let url = audioURL { try? player.load(url: url) }
        }
    }

    // MARK: - Actions

    private func triggerCelebration() {
        HapticsManager.shared.success()
        showCelebration = true
        confettiParticles = (0..<80).map { _ in ConfettiParticle() }

        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            appearScale = 1.0
            appearOpacity = 1.0
        }

        // Stop confetti after 3s
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation { showCelebration = false }
        }
    }

    private func shareClip() {
        HapticsManager.shared.medium()
        guard let url = audioURL else {
            toastMessage = "No clip to share"
            showToast = true
            return
        }

        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }

        toastMessage = "Opening share sheet..."
        showToast = true
    }
}

// MARK: - Confetti Particle

struct ConfettiParticle: Identifiable {
    let id = UUID()
    var x: CGFloat = CGFloat.random(in: 0...1)
    var delay: Double = Double.random(in: 0...1.5)
    var size: CGFloat = CGFloat.random(in: 6...14)
    var color: Color = [
        Color(hex: "#DAFC79"), .white, .blue, .pink, .orange, .green
    ].randomElement()!
    var rotation: Double = Double.random(in: 0...360)
    var isCircle: Bool = Bool.random()
}

struct ConfettiView: View {
    var particles: [ConfettiParticle]
    @State private var fallen = false

    var body: some View {
        GeometryReader { geo in
            ForEach(particles) { p in
                confettiShape(p)
                    .frame(width: p.size, height: p.size)
                    .foregroundColor(p.color)
                    .position(
                        x: p.x * geo.size.width,
                        y: fallen ? geo.size.height + 40 : -20
                    )
                    .rotationEffect(.degrees(fallen ? p.rotation + 360 : p.rotation))
                    .animation(
                        .easeIn(duration: Double.random(in: 1.5...3.0))
                        .delay(p.delay),
                        value: fallen
                    )
            }
        }
        .onAppear { fallen = true }
    }

    @ViewBuilder
    private func confettiShape(_ p: ConfettiParticle) -> some View {
        if p.isCircle {
            Circle()
        } else {
            RoundedRectangle(cornerRadius: 2)
        }
    }
}
