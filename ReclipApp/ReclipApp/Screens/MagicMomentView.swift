// MagicMomentView.swift
// ReclipApp
//
// Full-screen audio player with waveform trimmer, synced captions,
// and draggable trim handles.

import SwiftUI
import AVFoundation

// MARK: - DiamondShape

private struct DiamondShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to:    CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.midY))
        p.closeSubpath()
        return p
    }
}

// MARK: - PartialRoundedRectangle

private struct PartialRoundedRect: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - WaveformTrimmerView

struct WaveformTrimmerView: View {

    @ObservedObject var player: AudioPlayerManager

    // Constants
    private let barCount      = 120
    private let handleW: CGFloat = 16
    private let glowW:   CGFloat = 20
    private let haptic = UIImpactFeedbackGenerator(style: .rigid)

    var body: some View {
        GeometryReader { geo in
            let totalW   = geo.size.width
            let totalH   = geo.size.height
            let innerW   = totalW - handleW * 2
            let barW     = innerW / CGFloat(barCount)

            let dur          = max(player.duration, 0.001)
            let trimEnd      = player.trimEnd > 0 ? player.trimEnd : dur
            let trimSFrac    = CGFloat(player.trimStart / dur)
            let trimEFrac    = CGFloat(trimEnd / dur)
            let playFrac     = CGFloat(min(player.currentTime, dur) / dur)

            ZStack(alignment: .topLeading) {

                // ── Bars ──────────────────────────────────────────────────
                HStack(alignment: .center, spacing: 0) {
                    ForEach(0 ..< barCount, id: \.self) { i in
                        let frac       = CGFloat(i) / CGFloat(barCount)
                        let inTrim     = frac >= trimSFrac && frac < trimEFrac
                        let waveVal    = player.waveformBars.indices.contains(i)
                            ? CGFloat(player.waveformBars[i]) : 0.25
                        let liveIdx    = min(i * 80 / max(barCount, 1), 79)
                        let liveVal    = player.audioLevels.indices.contains(liveIdx)
                            ? CGFloat(player.audioLevels[liveIdx]) : 0
                        let val: CGFloat = inTrim
                            ? (liveVal * 0.7 + waveVal * 0.3)
                            : waveVal
                        let barH       = max(4, val * (totalH - 8))

                        RoundedRectangle(cornerRadius: 2)
                            .fill(inTrim ? Theme.Colors.brand : Color.white.opacity(0.35))
                            .frame(width: max(1.5, barW - 1), height: barH)
                            .frame(width: barW, height: totalH, alignment: .center)
                    }
                }
                .frame(width: innerW, height: totalH)
                .offset(x: handleW)

                // ── Playhead glow + line + diamonds ───────────────────────
                let playX = handleW + playFrac * innerW

                // Glow
                LinearGradient(
                    colors: [
                        Theme.Colors.brand.opacity(0),
                        Theme.Colors.brand.opacity(0.4),
                        Theme.Colors.brand.opacity(0)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: glowW, height: totalH)
                .offset(x: playX - glowW / 2)
                .allowsHitTesting(false)

                // Line
                Rectangle()
                    .fill(Theme.Colors.brand)
                    .frame(width: 2, height: totalH)
                    .offset(x: playX - 1)
                    .allowsHitTesting(false)

                // Top diamond
                DiamondShape()
                    .fill(Theme.Colors.brand)
                    .frame(width: 10, height: 10)
                    .offset(x: playX - 5, y: -1)
                    .allowsHitTesting(false)

                // Bottom diamond
                DiamondShape()
                    .fill(Theme.Colors.brand)
                    .frame(width: 10, height: 10)
                    .offset(x: playX - 5, y: totalH - 9)
                    .allowsHitTesting(false)

                // ── Left trim handle ───────────────────────────────────────
                let leftX = handleW + trimSFrac * innerW - handleW
                PartialRoundedRect(radius: 5, corners: [.topLeft, .bottomLeft])
                    .fill(Theme.Colors.brand)
                    .frame(width: handleW, height: totalH)
                    .offset(x: max(0, leftX))
                    .gesture(
                        DragGesture(minimumDistance: 1, coordinateSpace: .local)
                            .onChanged { value in
                                haptic.impactOccurred()
                                let rawX    = value.location.x - handleW / 2
                                let frac    = rawX / innerW
                                let clamped = max(0, min(frac, CGFloat((trimEnd / dur)) - 0.05))
                                player.trimStart = Double(clamped) * dur
                                player.seek(to: player.trimStart)
                            }
                    )

                // ── Right trim handle ──────────────────────────────────────
                let rightX = handleW + trimEFrac * innerW
                PartialRoundedRect(radius: 5, corners: [.topRight, .bottomRight])
                    .fill(Theme.Colors.brand)
                    .frame(width: handleW, height: totalH)
                    .offset(x: min(rightX, totalW - handleW))
                    .gesture(
                        DragGesture(minimumDistance: 1, coordinateSpace: .local)
                            .onChanged { value in
                                haptic.impactOccurred()
                                let rawX    = value.location.x + rightX - handleW / 2
                                let frac    = rawX / innerW
                                let clamped = max(CGFloat(player.trimStart / dur) + 0.05,
                                                  min(frac, 1.0))
                                player.trimEnd = Double(clamped) * dur
                            }
                    )
            }
        }
        .frame(height: 120)
    }
}

// MARK: - MagicMomentView

struct MagicMomentView: View {

    // MARK: Parameters
    let audioURL: URL?
    let captions: [CaptionSegment]
    let onShare:  (URL?, [CaptionSegment]) -> Void
    let onBack:   () -> Void

    // MARK: State
    @StateObject var player = AudioPlayerManager()

    // MARK: Body
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Logo ──────────────────────────────────────────────────
                ReclipLogoView()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 56)
                    .padding(.bottom, 24)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {

                        // ── Heading ───────────────────────────────────────
                        HStack(alignment: .center, spacing: 10) {
                            Text("YOUR CLIP")
                                .font(Theme.Fonts.druk(36))
                                .foregroundColor(.white)
                            Image(systemName: "scissors")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.white)
                            Spacer()
                        }

                        // ── Waveform Trimmer ──────────────────────────────
                        WaveformTrimmerView(player: player)

                        // ── Time Display ──────────────────────────────────
                        HStack(spacing: 4) {
                            Text(formatTime(player.currentTime))
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(Theme.Colors.muted)
                            Text("/")
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(Theme.Colors.muted)
                            Text(formatTime(player.duration))
                                .font(.system(size: 13, weight: .regular))
                                .foregroundColor(Theme.Colors.muted)
                            Spacer()
                        }

                        // ── Play / Pause ───────────────────────────────────
                        Button {
                            if player.isPlaying { player.pause() } else { player.play() }
                            HapticsManager.shared.medium()
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(Theme.Colors.brand)
                                    .frame(width: 44, height: 44)
                                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                    .font(.system(size: 18, weight: .black))
                                    .foregroundColor(.black)
                            }
                        }
                        .buttonStyle(.plain)

                        // ── Synced Captions ────────────────────────────────
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(captions) { seg in
                                let visible = player.currentTime >= seg.time
                                Text(seg.text)
                                    .font(.system(size: 16, weight: .regular))
                                    .foregroundColor(.white)
                                    .opacity(visible ? 1 : 0)
                                    .animation(.easeIn(duration: 0.3), value: visible)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .frame(minHeight: 72)

                        Spacer(minLength: 16)

                        // ── Share CTA ──────────────────────────────────────
                        Button {
                            HapticsManager.shared.medium()
                            onShare(audioURL, captions)
                        } label: {
                            Text("Share this moment >")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .frame(height: 58)
                                .background(Theme.Colors.brand)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .padding(.bottom, 40)
                    }
                    .padding(.horizontal, 24)
                }
            }
        }
        .onAppear {
            if let url = audioURL {
                player.load(url: url)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    player.play()
                }
            }
        }
    }

    // MARK: Helpers

    private func formatTime(_ t: Double) -> String {
        guard t.isFinite, t >= 0 else { return "0:00.0" }
        let minutes = Int(t) / 60
        let seconds = Int(t) % 60
        let tenths  = Int((t - Double(Int(t))) * 10)
        return String(format: "%d:%02d.%d", minutes, seconds, tenths)
    }
}

// MARK: - Preview

#if DEBUG
struct MagicMomentView_Previews: PreviewProvider {
    static var previews: some View {
        MagicMomentView(
            audioURL: nil,
            captions: CaptionSegment.preview,
            onShare:  { _, _ in },
            onBack:   {}
        )
        .preferredColorScheme(.dark)
    }
}
#endif
