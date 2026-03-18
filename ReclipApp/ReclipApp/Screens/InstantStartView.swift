// InstantStartView.swift
// ReclipApp
//
// Clip recording screen: idle → capture → celebrating
// Uses AudioEngine.shared and RollingRecorder for live audio.

import SwiftUI
import AVFoundation

// MARK: - Phase enum

private enum InstantPhase: Equatable {
    case idle
    case capture
    case celebrating
}

// MARK: - Idle Bar Seed

private struct IdleBarSeed {
    let freq1:  Double
    let freq2:  Double
    let freq3:  Double
    let phase1: Double
    let phase2: Double
    let phase3: Double
    let amp1:   Double
    let amp2:   Double
    let amp3:   Double
}

// MARK: - Circular Waveform Canvas

/// Reusable 60fps circular waveform visualiser.
/// When `isActive` is true, it reads from `audioLevels`; otherwise it uses idle synthesis.
struct CircularWaveformCanvas: View {

    /// Live FFT levels (64 floats, 0–1). Pass nil or empty for idle mode.
    var audioLevels: [Float] = []
    /// Synthesised idle seeds — must have 48 elements for idle mode.
    var idleSeeds: [IdleBarSeed] = []
    /// When true the bars react to `audioLevels` instead of idle seeds.
    var isActive: Bool = false

    var body: some View {
        TimelineView(.animation) { tl in
            Canvas { ctx, size in
                let t   = tl.date.timeIntervalSinceReferenceDate
                let cx  = size.width  / 2
                let cy  = size.height / 2
                let s   = min(size.width, size.height) / 320.0

                // Average level (0–1) drives ring alpha and ring speed.
                let avgLevel: Double = {
                    guard isActive, !audioLevels.isEmpty else { return 0 }
                    let sum = audioLevels.reduce(0.0) { $0 + Double($1) }
                    return min(sum / Double(audioLevels.count), 1.0)
                }()

                let speed = 0.4 + avgLevel * 0.4

                // ── 6 Waveform rings ──────────────────────────────────────
                let angularMults: [Double] = [4, 7]
                let ampMults:     [Double] = [3, 1.5]
                let speedMults:   [Double] = [4, 6]

                for ring in 0..<6 {
                    let ringPhase = fmod((t * speed + Double(ring)) / 6.0, 1.0) * Double.pi * 2
                    let innerR    = 60.0 * s
                    let outerR    = 150.0 * s
                    let ringR     = innerR + (outerR - innerR) * Double(ring) / 6.0
                    let segCount  = 64

                    var ringPath = Path()
                    for seg in 0...segCount {
                        let angle = Double(seg) / Double(segCount) * Double.pi * 2
                        var dist  = 0.0
                        for mi in 0..<angularMults.count {
                            dist += sin(angle * angularMults[mi] + t * speedMults[mi] + ringPhase)
                                    * ampMults[mi] * s
                        }
                        let r  = ringR + dist
                        let px = cx + CGFloat(cos(angle) * r)
                        let py = cy + CGFloat(sin(angle) * r)
                        if seg == 0 { ringPath.move(to: CGPoint(x: px, y: py)) }
                        else        { ringPath.addLine(to: CGPoint(x: px, y: py)) }
                    }
                    ringPath.closeSubpath()

                    let waveAmp   = max(avgLevel, 0.3)
                    let ringAlpha = (1.0 - Double(ring) / 7.0) * (0.18 + avgLevel * 0.25) * waveAmp
                    let blend     = Double(ring) / 5.0
                    let ringColor = Color(hue: (80.0 + blend * 30.0) / 360.0,
                                         saturation: 0.85,
                                         brightness: 0.90,
                                         opacity: ringAlpha)
                    ctx.stroke(ringPath, with: .color(ringColor),
                               style: StrokeStyle(lineWidth: 1.2 * s))
                }

                // ── 48 Radiating bars ─────────────────────────────────────
                for i in 0..<48 {
                    let angle = Double(i) / 48.0 * Double.pi * 2
                    let fi    = Double(i)

                    let intensity: Double = {
                        if isActive, !audioLevels.isEmpty {
                            let bin = i * audioLevels.count / 48
                            let raw = bin < audioLevels.count ? Double(audioLevels[bin]) : 0
                            return min(raw * 1.4, 1.0)
                        }
                        // Idle synthesis
                        if i < idleSeeds.count {
                            let sd = idleSeeds[i]
                            return min(abs(
                                sin(t * sd.freq1 + sd.phase1 + fi * 0.3) * sd.amp1 +
                                sin(t * sd.freq2 + sd.phase2 + fi * 0.7) * sd.amp2 +
                                cos(t * sd.freq3 + sd.phase3 + fi * 0.15) * sd.amp3
                            ), 1.0)
                        }
                        return abs(sin(t * 1.2 + fi * 0.3) * 0.5 + sin(t * 0.8 + fi * 0.7) * 0.3)
                    }()

                    let innerR = 58.0 * s
                    let maxLen = 40.0 * s
                    let barLen = maxLen * CGFloat(intensity)

                    let x1 = cx + CGFloat(cos(angle)) * innerR
                    let y1 = cy + CGFloat(sin(angle)) * innerR
                    let x2 = cx + CGFloat(cos(angle)) * (innerR + barLen)
                    let y2 = cy + CGFloat(sin(angle)) * (innerR + barLen)

                    let rC = 218.0 * (1 - intensity * 0.5)
                    let gC = 252.0 * (1 - intensity * 0.3) + 200.0 * intensity * 0.3
                    let bC = 121.0 * (1 - intensity * 0.6) + 255.0 * intensity * 0.6
                    let a  = isActive ? 0.4 + intensity * 0.5 : 0.2 + intensity * 0.3

                    let barColor = Color(red: rC / 255, green: gC / 255, blue: bC / 255, opacity: a)

                    var bp = Path()
                    bp.move(to: CGPoint(x: x1, y: y1))
                    bp.addLine(to: CGPoint(x: x2, y: y2))
                    ctx.stroke(bp, with: .color(barColor),
                               style: StrokeStyle(lineWidth: 2.5 * s, lineCap: .round))
                }

                // ── Outer contour ring (72 segments) ─────────────────────
                let contourBaseR = 160.0 * s
                var contourPath  = Path()
                for i in 0...72 {
                    let angle = Double(i) / 72.0 * Double.pi * 2
                    let wave  = sin(angle * 9 + t * 1.5) * 3.5 * s
                              + sin(angle * 5 - t      ) * 2.0 * s
                    let r  = contourBaseR + wave + avgLevel * 12.0 * s
                    let px = cx + CGFloat(cos(angle) * r)
                    let py = cy + CGFloat(sin(angle) * r)
                    if i == 0 { contourPath.move(to: CGPoint(x: px, y: py)) }
                    else       { contourPath.addLine(to: CGPoint(x: px, y: py)) }
                }
                contourPath.closeSubpath()
                ctx.stroke(contourPath,
                           with: .color(Theme.Colors.brand.opacity(0.08 + avgLevel * 0.12)),
                           style: StrokeStyle(lineWidth: 1.5 * s))

                // ── Inner ambient glow core ───────────────────────────────
                let glowR = 50.0 * s + avgLevel * 15.0 * s
                for g in 0..<6 {
                    let fraction = Double(g) / 6.0
                    let gr       = glowR * (1.0 - fraction * 0.8)
                    let ga       = (1.0 - fraction) * 0.06 * (1.0 + avgLevel)
                    let glowRect = CGRect(x: cx - gr, y: cy - gr, width: gr * 2, height: gr * 2)
                    ctx.fill(Path(ellipseIn: glowRect),
                             with: .color(Theme.Colors.brand.opacity(ga)))
                }
            }
        }
    }
}

// MARK: - Celebrating Overlay Canvas

/// Full-screen canvas overlay shown during the celebrating phase (2.8 s).
struct CelebratingOverlayCanvas: View {

    /// Seconds of audio saved (used in the label).
    let savedSeconds: Int
    /// Called after the 2.8-second animation completes.
    let onFinish: () -> Void

    @State private var progress:  Double = 0
    @State private var animTimer: Timer? = nil
    @State private var confettiParticles: [CParticle] = []

    private struct CParticle {
        let angle: Double
        let speed: Double
        let hue:   Double
        let size:  CGFloat
    }
    private let confettiHues: [Double] = [70, 80, 170, 190, 350]
    private let duration: Double = 2.8

    var body: some View {
        TimelineView(.animation) { _ in
            Canvas { ctx, size in
                let cx = size.width  / 2
                let cy = size.height / 2
                let s  = min(size.width, size.height) / 320.0
                let p  = progress

                // Burst radial glow
                for g in 0..<8 {
                    let fraction = Double(g) / 8.0
                    let r = (80.0 + Double(g) * 25.0) * s * (0.5 + p * 0.8)
                    let a = (1.0 - fraction) * 0.15 * sin(p * .pi)
                    let rect = CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
                    ctx.fill(Path(ellipseIn: rect), with: .color(Theme.Colors.brand.opacity(a)))
                }

                // 3 expanding rings
                for i in 0..<3 {
                    let ringP = max(0, p - Double(i) * 0.1)
                    let r    = (50.0 + ringP * 180.0) * s
                    let a    = max(0, 0.6 - ringP * 0.65)
                    let rect = CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
                    ctx.stroke(Path(ellipseIn: rect),
                               with: .color(Theme.Colors.brand.opacity(a)),
                               style: StrokeStyle(lineWidth: 2.5 * s))
                }

                // Checkmark circle (scales in)
                let checkScale = min(p * 3.0, 1.0)
                let circleR    = 44.0 * s * checkScale
                if circleR > 0 {
                    let circleRect = CGRect(x: cx - circleR, y: cy - circleR,
                                           width: circleR * 2, height: circleR * 2)
                    ctx.fill(Path(ellipseIn: circleRect), with: .color(Theme.Colors.brand))

                    // Animated checkmark stroke
                    if checkScale > 0.5 {
                        let ck = min((checkScale - 0.5) / 0.5, 1.0)
                        let pts: [(Double, Double)] = [(-12, -1), (-3, 9), (14, -8)]
                        var ckPath = Path()
                        let pt0 = CGPoint(x: cx + CGFloat(pts[0].0 * s * checkScale),
                                          y: cy + CGFloat(pts[0].1 * s * checkScale))
                        let pt1 = CGPoint(x: cx + CGFloat(pts[1].0 * s * checkScale),
                                          y: cy + CGFloat(pts[1].1 * s * checkScale))
                        let pt2 = CGPoint(x: cx + CGFloat(pts[2].0 * s * checkScale),
                                          y: cy + CGFloat(pts[2].1 * s * checkScale))
                        ckPath.move(to: pt0)
                        if ck < 0.5 {
                            let lerpT = ck / 0.5
                            ckPath.addLine(to: CGPoint(x: pt0.x + (pt1.x - pt0.x) * lerpT,
                                                       y: pt0.y + (pt1.y - pt0.y) * lerpT))
                        } else {
                            ckPath.addLine(to: pt1)
                            let lerpT = (ck - 0.5) / 0.5
                            ckPath.addLine(to: CGPoint(x: pt1.x + (pt2.x - pt1.x) * lerpT,
                                                       y: pt1.y + (pt2.y - pt1.y) * lerpT))
                        }
                        ctx.stroke(ckPath, with: .color(Color.black),
                                   style: StrokeStyle(lineWidth: 3.5 * s, lineCap: .round, lineJoin: .round))
                    }

                    // "X of 2 min saved!" label
                    if checkScale > 0.7 {
                        let textAlpha = min((checkScale - 0.7) / 0.3, 1.0)
                        let textY     = cy + 52.0 * s * checkScale + 16
                        let savedMin  = max(savedSeconds / 60, 0)
                        let labelStr  = "\(savedMin) of 2 min saved!"
                        var attrs     = AttributeContainer()
                        attrs.foregroundColor = Theme.Colors.brand.opacity(textAlpha)
                        attrs.font = .system(size: 14, weight: .bold)
                        ctx.draw(Text(AttributedString(labelStr, attributes: attrs)),
                                 at: CGPoint(x: cx, y: textY))
                    }
                }

                // 50 confetti particles with gravity
                for particle in confettiParticles {
                    let t2   = p * duration
                    let px   = cx + CGFloat(cos(particle.angle) * particle.speed * t2 * 60 * s)
                    let grav = 0.5 * 9.8 * t2 * t2 * 12.0 * Double(s)
                    let py   = cy + CGFloat(sin(particle.angle) * particle.speed * t2 * 60 * s) + CGFloat(grav)
                    let a    = max(0, 1.0 - p * 0.9)
                    let pr   = particle.size / 2
                    let color = Color(hue: particle.hue / 360.0, saturation: 0.9, brightness: 0.95, opacity: a)
                    ctx.fill(Path(ellipseIn: CGRect(x: px - pr, y: py - pr,
                                                    width: pr * 2, height: pr * 2)),
                             with: .color(color))
                }
            }
        }
        .ignoresSafeArea()
        .onAppear {
            confettiParticles = (0..<50).map { _ in
                CParticle(
                    angle: Double.random(in: 0...(Double.pi * 2)),
                    speed: Double.random(in: 0.5...2.0),
                    hue:   confettiHues.randomElement()!,
                    size:  CGFloat.random(in: 4...9)
                )
            }
            startAnimation()
        }
        .onDisappear {
            animTimer?.invalidate()
        }
    }

    private func startAnimation() {
        let tick: Double = 1.0 / 60.0
        var elapsed = 0.0
        animTimer = Timer.scheduledTimer(withTimeInterval: tick, repeats: true) { t in
            elapsed  += tick
            progress  = min(elapsed / duration, 1.0)
            if elapsed >= duration {
                t.invalidate()
                onFinish()
            }
        }
    }
}

// MARK: - InstantStartView

struct InstantStartView: View {

    /// Called when the clip is ready. `url` may be nil if the engine had no data.
    /// `captions` is always empty here (no speech-to-text in this screen).
    var onClipSaved: (URL?, [CaptionSegment]) -> Void = { _, _ in }

    @StateObject private var audioEngine = AudioEngine.shared
    @StateObject private var recorder    = RollingRecorder()

    @State private var phase: InstantPhase = .idle
    @State private var idleSeeds: [IdleBarSeed] = []

    // Capture phase state
    @State private var clipButtonScale: CGFloat = 0
    @State private var headerToggled:   Bool    = false
    @State private var headerTimer:     Timer?  = nil
    @State private var redDotPulse:     Bool    = false

    // Clip result
    @State private var savedURL:      URL?              = nil
    @State private var savedCaptions: [CaptionSegment]  = []

    // Idle CTA fill animation
    @State private var micButtonFilled: Bool   = false
    @State private var micFillProgress: Double = 0
    @State private var micFillTimer:    Timer? = nil

    // MARK: - Body

    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()

            switch phase {
            case .idle:
                idlePhaseView
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal:   .move(edge: .leading).combined(with: .opacity)
                    ))

            case .capture:
                capturePhaseView
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal:   .move(edge: .leading).combined(with: .opacity)
                    ))

            case .celebrating:
                celebratingPhaseView
                    .transition(.asymmetric(
                        insertion: .opacity,
                        removal:   .opacity
                    ))
            }
        }
        .onAppear {
            buildIdleSeeds()
            startMicFillTimer()
        }
        .onDisappear {
            headerTimer?.invalidate()
            micFillTimer?.invalidate()
        }
    }

    // MARK: - Idle Phase

    private var idlePhaseView: some View {
        VStack(spacing: 0) {
            // Logo top-left
            HStack {
                ReclipLogoView()
                    .padding(.leading, 20)
                Spacer()
            }
            .padding(.top, 8)
            .frame(height: 52)

            Spacer(minLength: 12)

            // Circular waveform (idle)
            CircularWaveformCanvas(
                audioLevels: [],
                idleSeeds:   idleSeeds,
                isActive:    false
            )
            .frame(width: 300, height: 300)

            Spacer(minLength: 20)

            // Heading
            Text("Clip it before\nyou miss it!")
                .font(Theme.Fonts.druk(52))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

            // Subtext
            VStack(spacing: 6) {
                Text("Save up to 2 mins of audio.")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Theme.Colors.muted)
                Text("The jokes, The cap, The receipts. Clipped 🎤✨")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Theme.Colors.muted)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)

            // CTA mic button
            Button(action: handleMicButtonTap) {
                ZStack {
                    Capsule()
                        .fill(micButtonFilled ? Theme.Colors.brand : Color.clear)
                        .overlay(
                            Capsule()
                                .stroke(Theme.Colors.brand.opacity(micButtonFilled ? 0 : 0.4),
                                        lineWidth: 2)
                        )

                    // Progress fill sweep
                    if !micButtonFilled {
                        GeometryReader { geo in
                            Capsule()
                                .fill(Theme.Colors.brand.opacity(0.14))
                                .frame(width: geo.size.width * micFillProgress)
                                .animation(.linear(duration: 0.05), value: micFillProgress)
                        }
                        .clipShape(Capsule())
                    }

                    HStack(spacing: 10) {
                        Image(systemName: "mic.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(micButtonFilled ? .black : Theme.Colors.brand)

                        Text("Turn on your mic")
                            .font(Theme.Fonts.druk(17))
                            .foregroundColor(micButtonFilled ? .black : Theme.Colors.brand)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(micButtonFilled ? .black : Theme.Colors.brand)
                    }
                    .padding(.horizontal, 8)
                }
                .frame(height: 56)
                .padding(.horizontal, 32)
            }

            Spacer(minLength: 40)
        }
    }

    // MARK: - Capture Phase

    private var capturePhaseView: some View {
        VStack(spacing: 0) {
            // Logo top-left
            HStack {
                ReclipLogoView()
                    .padding(.leading, 20)
                Spacer()
            }
            .padding(.top, 8)
            .frame(height: 52)

            Spacer(minLength: 8)

            // Header — toggles after 1.8 s
            VStack(spacing: 8) {
                if !headerToggled {
                    Text("Learn how to clip")
                        .font(Theme.Fonts.druk(36))
                        .foregroundColor(.white)
                        .transition(.asymmetric(
                            insertion: .move(edge: .top).combined(with: .opacity),
                            removal:   .move(edge: .top).combined(with: .opacity)
                        ))
                } else {
                    Text("Say something,\nanything!")
                        .font(Theme.Fonts.druk(44))
                        .foregroundColor(Theme.Colors.accent)
                        .multilineTextAlignment(.center)
                        .transition(.asymmetric(
                            insertion: .move(edge: .bottom).combined(with: .opacity),
                            removal:   .move(edge: .bottom).combined(with: .opacity)
                        ))
                }

                // Recording indicator
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                        .scaleEffect(redDotPulse ? 1.3 : 0.85)
                        .animation(
                            .easeInOut(duration: 0.75).repeatForever(autoreverses: true),
                            value: redDotPulse
                        )
                        .onAppear { redDotPulse = true }

                    Text("Listening...")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(Theme.Colors.muted)
                }
                .padding(.top, 4)
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: headerToggled)
            .padding(.horizontal, 24)
            .frame(minHeight: 100)

            Spacer(minLength: 8)

            // Waveform + centred clip button
            ZStack {
                CircularWaveformCanvas(
                    audioLevels: audioEngine.audioLevels,
                    idleSeeds:   idleSeeds,
                    isActive:    true
                )
                .frame(width: 300, height: 300)

                // Ambient glow rings
                Circle()
                    .fill(Theme.Colors.brand.opacity(0.08))
                    .frame(width: 108, height: 108)
                Circle()
                    .stroke(Theme.Colors.brand.opacity(0.2), lineWidth: 1.5)
                    .frame(width: 108, height: 108)

                // Hint ring
                Circle()
                    .stroke(Theme.Colors.brand.opacity(0.10), lineWidth: 1)
                    .frame(width: 130, height: 130)

                // Clip button
                Button(action: handleClipButtonTap) {
                    ZStack {
                        Circle()
                            .fill(Theme.Colors.brand)
                            .frame(width: 88, height: 88)
                        ClipIconView(size: 36, color: .black)
                    }
                }
                .scaleEffect(clipButtonScale)
                .animation(
                    .spring(response: 0.38, dampingFraction: 0.85, blendDuration: 0)
                    .delay(0.2),
                    value: clipButtonScale
                )
                .buttonStyle(ClipButtonPressStyle())
            }

            Spacer(minLength: 16)

            // Bottom hint
            HStack(spacing: 4) {
                Text("TAP")
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(Theme.Colors.muted)
                ClipIconView(size: 16, color: Theme.Colors.muted)
                Text("ABOVE TO")
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(Theme.Colors.muted)
                Text("CLIP")
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(Theme.Colors.brand)
            }
            .padding(.bottom, 40)
        }
        .onAppear {
            // Clip button entrance spring: scale 0 → 1 after 0.2s
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                clipButtonScale = 1.0
            }
            // Header toggle after 1.8s
            headerTimer = Timer.scheduledTimer(withTimeInterval: 1.8, repeats: false) { _ in
                withAnimation { headerToggled = true }
            }
        }
    }

    // MARK: - Celebrating Phase

    private var celebratingPhaseView: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            CelebratingOverlayCanvas(
                savedSeconds: Int(min(recorder.bufferDuration, 120)),
                onFinish: {
                    onClipSaved(savedURL, savedCaptions)
                }
            )
        }
    }

    // MARK: - Actions

    private func handleMicButtonTap() {
        Task {
            let granted = await audioEngine.requestPermission()
            guard granted else { return }
            do {
                try audioEngine.startMonitoring()
            } catch {
                print("[InstantStartView] AudioEngine start error: \(error)")
            }
            // Short delay to let the waveform animate before switching phase
            try? await Task.sleep(nanoseconds: 900_000_000)
            await MainActor.run {
                withAnimation(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal:   .move(edge: .leading).combined(with: .opacity)
                )) {
                    phase = .capture
                }
            }
        }
    }

    private func handleClipButtonTap() {
        let url = recorder.stopAndGetURL()
        savedURL      = url
        savedCaptions = []           // live captions not yet wired on this screen
        audioEngine.stopMonitoring()
        withAnimation(.asymmetric(
            insertion: .opacity,
            removal:   .opacity
        )) {
            phase = .celebrating
        }
    }

    // MARK: - Helpers

    private func buildIdleSeeds() {
        guard idleSeeds.isEmpty else { return }
        idleSeeds = (0..<48).map { _ in
            IdleBarSeed(
                freq1:  Double.random(in: 0.5...1.5),
                freq2:  Double.random(in: 1.0...2.5),
                freq3:  Double.random(in: 0.3...1.0),
                phase1: Double.random(in: 0...(2 * .pi)),
                phase2: Double.random(in: 0...(2 * .pi)),
                phase3: Double.random(in: 0...(2 * .pi)),
                amp1:   Double.random(in: 0.3...0.55),
                amp2:   Double.random(in: 0.2...0.40),
                amp3:   Double.random(in: 0.1...0.25)
            )
        }
    }

    private func startMicFillTimer() {
        micFillProgress = 0
        micButtonFilled = false
        micFillTimer?.invalidate()

        let fillDelay    = 3.0
        let tickInterval = 0.05
        let totalTicks   = fillDelay / tickInterval
        var tick         = 0.0

        micFillTimer = Timer.scheduledTimer(withTimeInterval: tickInterval, repeats: true) { t in
            tick           += 1
            micFillProgress = min(tick / totalTicks, 1.0)
            if tick >= totalTicks {
                t.invalidate()
                withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                    micButtonFilled = true
                }
            }
        }
    }
}

// MARK: - ClipButtonPressStyle

private struct ClipButtonPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.82 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.65), value: configuration.isPressed)
    }
}

// MARK: - Preview

#if DEBUG
struct InstantStartView_Previews: PreviewProvider {
    static var previews: some View {
        InstantStartView()
            .preferredColorScheme(.dark)
    }
}
#endif
