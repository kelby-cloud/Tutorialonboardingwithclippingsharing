// DoneView.swift
// ReclipApp
//
// Onboarding completion screen — confetti burst, "YOU'RE IN." headline,
// and a Replay button to restart the flow.

import SwiftUI

// MARK: - DoneConfettiParticle

private struct DoneConfettiParticle {
    let x:      CGFloat   // 0…1 normalised start x
    let hue:    Double    // 0…1 colour wheel
    let size:   CGFloat   // 6…14 pt
    let speed:  CGFloat   // pts/sec
    let delay:  Double    // seconds offset
    let spin:   Double    // initial rotation
    let wobble: Double    // horizontal wobble frequency
}

// MARK: - DoneView

struct DoneView: View {

    // MARK: Parameters

    var onReplay: () -> Void

    // MARK: State

    @State private var appeared    = false
    @State private var emojiScale: CGFloat = 0.1
    @State private var titleScale: CGFloat = 0.8
    @State private var titleOpacity: Double = 0
    @State private var subtitleOpacity: Double = 0
    @State private var buttonOpacity: Double = 0
    @State private var showConfetti = false

    // MARK: Constants

    private let confettiDuration: Double = 3.0
    private let particles: [DoneConfettiParticle] = Self.makeParticles()

    // MARK: Body

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Confetti Canvas
            if showConfetti {
                TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { tl in
                    Canvas { ctx, size in
                        let elapsed = tl.date.timeIntervalSince(confettiStart)
                        guard elapsed < confettiDuration + 1.0 else { return }

                        for p in particles {
                            let t = max(0, elapsed - p.delay)
                            guard t > 0 else { continue }

                            let fallY    = CGFloat(t) * p.speed
                            let wobbleX  = sin(t * p.wobble * .pi * 2) * 18
                            let x        = p.x * size.width + wobbleX
                            let y        = -10 + fallY
                            let rotation = Angle(degrees: p.spin + t * 180)

                            guard y < size.height + 20 else { continue }

                            ctx.opacity = min(1, max(0, 1 - (y - size.height * 0.7) / (size.height * 0.3)))

                            var transform = CGAffineTransform(translationX: x, y: y)
                            transform = transform.rotated(by: rotation.radians)

                            let rect = CGRect(x: -p.size / 2, y: -p.size / 2, width: p.size, height: p.size * 0.5)
                            let path = Path(rect)

                            ctx.fill(
                                path.applying(transform),
                                with: .color(Color(hue: p.hue, saturation: 0.9, brightness: 1.0))
                            )
                        }
                    }
                }
                .ignoresSafeArea()
            }

            // Content
            VStack(spacing: 0) {
                Spacer()

                // 🎉 Emoji circle
                ZStack {
                    Circle()
                        .fill(Theme.Colors.brand)
                        .frame(width: 96, height: 96)

                    Text("🎉")
                        .font(.system(size: 48))
                }
                .scaleEffect(emojiScale)
                .animation(Theme.Springs.cardEntrance.delay(0.1), value: emojiScale)
                .padding(.bottom, 32)

                // Title
                Text("YOU'RE IN.")
                    .font(Theme.Fonts.druk(48))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .scaleEffect(titleScale)
                    .opacity(titleOpacity)
                    .animation(Theme.Springs.cardEntrance.delay(0.25), value: titleScale)
                    .animation(.easeOut(duration: 0.3).delay(0.25), value: titleOpacity)
                    .padding(.bottom, 12)

                // Subtitle
                Text("Welcome to Reclip.\nClip anything. Share everything.")
                    .font(Theme.Fonts.body)
                    .foregroundColor(Theme.Colors.muted)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .opacity(subtitleOpacity)
                    .animation(.easeOut(duration: 0.4).delay(0.45), value: subtitleOpacity)
                    .padding(.horizontal, 40)

                Spacer()

                // Replay / start fresh button
                ContinueButton(
                    label: "Start Reclipping >",
                    isEnabled: true,
                    fillDelay: nil
                ) {
                    HapticsManager.shared.success()
                    onReplay()
                }
                .opacity(buttonOpacity)
                .animation(.easeOut(duration: 0.4).delay(0.6), value: buttonOpacity)
                .padding(.horizontal, 24)
                .padding(.bottom, 48)
            }
        }
        .onAppear {
            guard !appeared else { return }
            appeared = true

            // Entrance animation sequence
            emojiScale = 1.0
            withAnimation { titleOpacity = 1; titleScale = 1.0 }
            withAnimation { subtitleOpacity = 1 }
            withAnimation { buttonOpacity = 1 }

            // Confetti
            showConfetti = true
            DispatchQueue.main.asyncAfter(deadline: .now() + confettiDuration + 1.5) {
                showConfetti = false
            }

            // Haptic
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                HapticsManager.shared.success()
            }
        }
    }

    // MARK: Confetti timing anchor

    private let confettiStart = Date()

    // MARK: Particle factory

    private static func makeParticles() -> [DoneConfettiParticle] {
        var particles: [DoneConfettiParticle] = []
        particles.reserveCapacity(60)
        // Use deterministic pseudo-random based on index for preview stability
        for i in 0..<60 {
            let fi = Double(i)
            let x      = CGFloat(fmod(fi * 0.618033 + 0.1, 1.0))
            let hue    = fmod(fi * 0.137 + 0.05, 1.0)
            let size   = CGFloat(6.0 + fmod(fi * 1.618, 8.0))
            let speed  = CGFloat(120 + fmod(fi * 37.1, 120))
            let delay  = fmod(fi * 0.047 + 0.01, 1.2)
            let spin   = fmod(fi * 23.7, 360)
            let wobble = 0.4 + fmod(fi * 0.13, 0.8)
            particles.append(DoneConfettiParticle(x: x, hue: hue, size: size, speed: speed, delay: delay, spin: spin, wobble: wobble))
        }
        return particles
    }
}

// MARK: - Previews

#if DEBUG
struct DoneView_Previews: PreviewProvider {
    static var previews: some View {
        DoneView(onReplay: {})
            .preferredColorScheme(.dark)
    }
}
#endif
