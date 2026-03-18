// ViralTriggerView.swift
// ReclipApp
//
// Share screen shown after clipping — confetti burst, expanding rings,
// share option pills, and animated Join CTA.

import SwiftUI
import AVFoundation

// MARK: - ConfettiParticle

private struct ConfettiParticle {
    let xFraction: CGFloat          // 0…1 normalised horizontal start
    let hue:       Double           // colour wheel angle 0…1
    let size:      CGFloat          // 6…14 pt
    let speed:     CGFloat          // pixels / sec
    let delay:     Double           // seconds after start
    let spin:      Double           // initial rotation degrees
    let wobble:    Double           // horizontal wobble frequency
}

// MARK: - ViralTriggerView

struct ViralTriggerView: View {

    // MARK: Parameters
    let audioURL: URL?
    let captions: [CaptionSegment]
    let onJoin: () -> Void

    // MARK: Player
    @StateObject var player = AudioPlayerManager()

    // MARK: Celebration
    @State private var showCanvas      = true
    private let celebrationStart       = Date()
    private let particles: [ConfettiParticle] = Self.makeParticles()

    // MARK: Content entrance
    @State private var headingVisible  = false
    @State private var pill1Visible    = false
    @State private var pill2Visible    = false
    @State private var pill3Visible    = false
    @State private var joinVisible     = false
    @State private var joinFillPct: CGFloat = 0

    // Emoji bounce offsets
    @State private var e1Y: CGFloat = 0
    @State private var e2Y: CGFloat = 0
    @State private var e3Y: CGFloat = 0

    // Toast
    @State private var toastText    = ""
    @State private var toastVisible = false

    // MARK: Body
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Celebration layer
            if showCanvas {
                TimelineView(.animation) { ctx in
                    Canvas { gctx, size in
                        drawConfetti(in: gctx, size: size, now: ctx.date)
                        drawRings(in: gctx, size: size, now: ctx.date)
                    }
                }
                .ignoresSafeArea()
                .allowsHitTesting(false)
            }

            // Main content
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {

                    // ── Logo ──────────────────────────────────────────────
                    ReclipLogoView()
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 56)

                    // ── Heading ───────────────────────────────────────────
                    Text("SHARE YOUR CLIP WITH FRIENDS")
                        .font(Theme.Fonts.druk(36))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: UIScreen.main.bounds.width * 0.75)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .offset(y: headingVisible ? 0 : -20)
                        .opacity(headingVisible ? 1 : 0)
                        .animation(.easeOut(duration: 0.5), value: headingVisible)

                    // ── Compact waveform player ───────────────────────────
                    CompactWaveformPlayer(player: player)

                    // ── Share pills ───────────────────────────────────────
                    VStack(spacing: 12) {

                        ShareOptionPill(
                            emoji: "💬",
                            emojiBounce: $e1Y,
                            label: "Send via Messages",
                            sublabel: "Text it to your group chat",
                            borderColor: Theme.Colors.accent,
                            labelColor: Theme.Colors.accent,
                            visible: $pill1Visible,
                            action: { shareViaMessages() }
                        )

                        ShareOptionPill(
                            emoji: "🔗",
                            emojiBounce: $e2Y,
                            label: "Copy Link",
                            sublabel: "Paste it anywhere",
                            borderColor: Theme.Colors.brand,
                            labelColor: Theme.Colors.brand,
                            visible: $pill2Visible,
                            action: {
                                UIPasteboard.general.string = "https://reclip.app/clip/demo"
                                showToast("Link copied!")
                            }
                        )

                        ShareOptionPill(
                            emoji: "⬇️",
                            emojiBounce: $e3Y,
                            label: "Save to Device",
                            sublabel: "Keep it forever",
                            borderColor: Theme.Colors.muted,
                            labelColor: .white,
                            visible: $pill3Visible,
                            action: { showToast("Clip downloaded!") }
                        )
                    }

                    Spacer(minLength: 12)

                    // ── Join Reclip CTA ───────────────────────────────────
                    GeometryReader { g in
                        Button { onJoin(); HapticsManager.shared.medium() } label: {
                            ZStack(alignment: .leading) {
                                // Background track
                                Capsule()
                                    .fill(Theme.Colors.brand.opacity(0.2))

                                // Animated fill
                                Capsule()
                                    .fill(Theme.Colors.brand)
                                    .frame(width: g.size.width * joinFillPct)

                                // Label
                                Text("Join Reclip >")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(.black)
                                    .frame(maxWidth: .infinity, alignment: .center)
                            }
                            .frame(height: 58)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    .frame(height: 58)
                    .opacity(joinVisible ? 1 : 0)
                    .padding(.bottom, 40)
                }
                .padding(.horizontal, 24)
            }

            // Toast
            if toastVisible {
                VStack {
                    Spacer()
                    Text(toastText)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Theme.Colors.brand)
                        .clipShape(Capsule())
                        .padding(.bottom, 100)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.75), value: toastVisible)
            }
        }
        .onAppear { setup() }
    }

    // MARK: – Setup

    private func setup() {
        if let url = audioURL {
            player.load(url: url)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { player.play() }
        }

        // Hide canvas after 1.8s
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
            withAnimation(.easeOut(duration: 0.4)) { showCanvas = false }
        }

        // Content entrance stagger
        withAnimation(.easeOut(duration: 0.5)) { headingVisible = true }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(Theme.Springs.cardEntrance) { pill1Visible = true }
            bounce(&e1Y)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) {
            withAnimation(Theme.Springs.cardEntrance) { pill2Visible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { bounce(&e2Y) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
            withAnimation(Theme.Springs.cardEntrance) { pill3Visible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { bounce(&e3Y) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation(.easeIn(duration: 0.2)) { joinVisible = true }
            // Fill delay 3s
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                withAnimation(.linear(duration: 3.0)) { joinFillPct = 1.0 }
            }
        }
    }

    // MARK: – Emoji bounce helper

    private func bounce(_ offset: inout CGFloat) {
        // Keyframe: 0 → -3 → 0
        withAnimation(.easeOut(duration: 0.12)) { offset = -3 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            withAnimation(.easeIn(duration: 0.12)) { offset = 0 }
        }
    }

    // MARK: – Toast

    private func showToast(_ message: String) {
        toastText = message
        withAnimation { toastVisible = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation { toastVisible = false }
        }
    }

    // MARK: – Share via Messages

    private func shareViaMessages() {
        let items: [Any] = audioURL.map { [$0] as [Any] }
            ?? ["Check out my clip! https://reclip.app/clip/demo"]
        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        guard let scene   = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window  = scene.windows.first,
              let rootVC  = window.rootViewController else { return }
        rootVC.present(av, animated: true)
    }

    // MARK: – Canvas helpers

    private static func makeParticles() -> [ConfettiParticle] {
        (0 ..< 35).map { _ in
            ConfettiParticle(
                xFraction: CGFloat.random(in: 0 ..< 1),
                hue:       Double.random(in: 0 ..< 1),
                size:      CGFloat.random(in: 6 ..< 14),
                speed:     CGFloat.random(in: 180 ..< 420),
                delay:     Double.random(in: 0 ..< 0.8),
                spin:      Double.random(in: 0 ..< 360),
                wobble:    Double.random(in: 2 ..< 5)
            )
        }
    }

    private func drawConfetti(in ctx: GraphicsContext, size: CGSize, now: Date) {
        let base = celebrationStart.timeIntervalSinceReferenceDate
        let t    = now.timeIntervalSinceReferenceDate
        for p in particles {
            let elapsed = max(0, t - base - p.delay)
            guard elapsed < 2.2 else { continue }
            let yPos    = CGFloat(elapsed) * p.speed
            let xPos    = p.xFraction * size.width + CGFloat(sin(elapsed * p.wobble)) * 18
            let alpha   = max(0, 1.0 - elapsed / 2.2)
            let angle   = Angle.degrees(p.spin + elapsed * 180)
            var c       = ctx
            c.opacity   = alpha
            c.translateBy(x: xPos, y: yPos)
            c.rotate(by: angle)
            let rect = CGRect(x: -p.size / 2, y: -p.size * 0.25,
                              width: p.size, height: p.size * 0.5)
            c.fill(Path(rect),
                   with: .color(Color(hue: p.hue, saturation: 0.9, brightness: 1.0)))
        }
    }

    private func drawRings(in ctx: GraphicsContext, size: CGSize, now: Date) {
        let base   = celebrationStart.timeIntervalSinceReferenceDate
        let t      = now.timeIntervalSinceReferenceDate
        let center = CGPoint(x: size.width / 2, y: size.height * 0.38)

        for i in 0 ..< 3 {
            let delay   = Double(i) * 0.35
            let elapsed = max(0, t - base - delay)
            guard elapsed < 1.5 else { continue }
            let progress = elapsed / 1.5
            let radius   = CGFloat(progress) * 130
            let alpha    = (1.0 - progress) * 0.65
            let rect     = CGRect(x: center.x - radius, y: center.y - radius,
                                  width: radius * 2, height: radius * 2)
            var c  = ctx
            c.opacity = alpha
            c.stroke(Path(ellipseIn: rect),
                     with: .color(Theme.Colors.brand),
                     lineWidth: 2.0)
        }
    }
}

// MARK: - CompactWaveformPlayer

private struct CompactWaveformPlayer: View {

    @ObservedObject var player: AudioPlayerManager
    private let barCount = 80

    var body: some View {
        VStack(spacing: 10) {
            // Waveform
            GeometryReader { geo in
                let totalW  = geo.size.width
                let totalH  = geo.size.height
                let barW    = totalW / CGFloat(barCount)
                let dur     = max(player.duration, 0.001)
                let playFrac = CGFloat(min(player.currentTime, dur) / dur)

                ZStack(alignment: .topLeading) {
                    // Bars
                    HStack(alignment: .center, spacing: 0) {
                        ForEach(0 ..< barCount, id: \.self) { i in
                            let frac     = CGFloat(i) / CGFloat(barCount)
                            let isPast   = frac < playFrac
                            let waveVal  = player.waveformBars.indices.contains(i)
                                ? CGFloat(player.waveformBars[i]) : 0.25
                            let liveVal  = player.audioLevels.indices.contains(i)
                                ? CGFloat(player.audioLevels[i]) : 0
                            let val: CGFloat = isPast
                                ? (liveVal * 0.7 + waveVal * 0.3)
                                : waveVal
                            let bH = max(3, val * (totalH - 4))
                            RoundedRectangle(cornerRadius: 1.5)
                                .fill(isPast ? Theme.Colors.brand : Color.white.opacity(0.3))
                                .frame(width: max(1.5, barW - 1), height: bH)
                                .frame(width: barW, height: totalH, alignment: .center)
                        }
                    }

                    // Playhead
                    let playX = playFrac * totalW
                    LinearGradient(
                        colors: [
                            Theme.Colors.brand.opacity(0),
                            Theme.Colors.brand.opacity(0.4),
                            Theme.Colors.brand.opacity(0)
                        ],
                        startPoint: .leading,
                        endPoint:   .trailing
                    )
                    .frame(width: 20, height: totalH)
                    .offset(x: playX - 10)
                    .allowsHitTesting(false)

                    Rectangle()
                        .fill(Theme.Colors.brand)
                        .frame(width: 2, height: totalH)
                        .offset(x: playX - 1)
                        .allowsHitTesting(false)
                }
            }
            .frame(height: 80)

            // Controls
            HStack {
                Text(formatTime(player.currentTime))
                    .font(.system(size: 13))
                    .foregroundColor(Theme.Colors.muted)

                Spacer()

                Button {
                    if player.isPlaying { player.pause() } else { player.play() }
                    HapticsManager.shared.medium()
                } label: {
                    ZStack {
                        Circle()
                            .fill(Theme.Colors.brand)
                            .frame(width: 40, height: 40)
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 16, weight: .black))
                            .foregroundColor(.black)
                    }
                }
                .buttonStyle(.plain)

                Spacer()

                Text(formatTime(player.duration))
                    .font(.system(size: 13))
                    .foregroundColor(Theme.Colors.muted)
            }
        }
    }

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite, t >= 0 else { return "0:00.0" }
        let m = Int(t) / 60
        let s = Int(t) % 60
        let tenth = Int((t - Double(Int(t))) * 10)
        return String(format: "%d:%02d.%d", m, s, tenth)
    }
}

// MARK: - ShareOptionPill

private struct ShareOptionPill: View {

    let emoji:       String
    @Binding var emojiBounce: CGFloat
    let label:       String
    let sublabel:    String
    let borderColor: Color
    let labelColor:  Color
    @Binding var visible: Bool
    let action:      () -> Void

    var body: some View {
        Button(action: { HapticsManager.shared.medium(); action() }) {
            HStack(spacing: 14) {
                Text(emoji)
                    .font(.system(size: 28))
                    .offset(y: emojiBounce)

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(labelColor)
                    Text(sublabel)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(Theme.Colors.muted)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(labelColor)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                Capsule()
                    .strokeBorder(borderColor, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .offset(x: visible ? 0 : -40)
        .opacity(visible ? 1 : 0)
    }
}

// MARK: - Preview

#if DEBUG
struct ViralTriggerView_Previews: PreviewProvider {
    static var previews: some View {
        ViralTriggerView(
            audioURL: nil,
            captions: CaptionSegment.preview,
            onJoin: {}
        )
        .preferredColorScheme(.dark)
    }
}
#endif
