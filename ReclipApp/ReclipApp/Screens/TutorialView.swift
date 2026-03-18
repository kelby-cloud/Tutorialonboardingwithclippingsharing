// TutorialView.swift
// ReclipApp
//
// Full 3-page tutorial carousel with animated illustrations.

import SwiftUI

// MARK: - WaveformBarSeed

private struct WaveformBarSeed {
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

// MARK: - ILLUSTRATION 1: WaveformPeopleIllustration

struct WaveformPeopleIllustration: View {

    @State private var seeds: [WaveformBarSeed] = []

    private let avatarOffsets: [(CGFloat, CGFloat)] = [(-120, -15), (0, -60), (120, -25), (45, 68)]
    private let avatarColors: [Color] = [
        Color(hex: "#4A90D9"),
        Color(hex: "#7B4EA0"),
        Color(hex: "#E07B3C"),
        Color(hex: "#C0392B")
    ]
    private let captionPool = [
        "Clip that 🔥", "not him saying that...", "Yoo!! clip that 😂",
        "say that again...", "Reclip that rn 🤣", "bro clip it 🫠"
    ]
    private let bubbleIndices = [0, 1, 2, 3]

    var body: some View {
        GeometryReader { geo in
            let cx = geo.size.width  / 2
            let cy = geo.size.height / 2

            ZStack {
                // Waveform bars + expanding rings
                TimelineView(.animation) { tl in
                    Canvas { ctx, size in
                        guard !seeds.isEmpty else { return }
                        let t   = tl.date.timeIntervalSinceReferenceDate
                        let ccx = size.width  / 2
                        let ccy = size.height / 2

                        // 3 expanding rings from center
                        for ring in 0..<3 {
                            let phase  = fmod(t * (0.4 + Double(ring) * 0.15) + Double(ring) * 0.8, 1.0)
                            let radius = CGFloat(phase) * 100
                            let alpha  = (1.0 - phase) * 0.10
                            let ringRect = CGRect(x: ccx - radius, y: ccy - radius,
                                                  width: radius * 2, height: radius * 2)
                            ctx.stroke(Path(ellipseIn: ringRect),
                                       with: .color(Theme.Colors.brand.opacity(alpha)),
                                       lineWidth: 1.5)
                        }

                        // 64 waveform bars
                        let barCount  = 64
                        let barWidth: CGFloat = 3
                        let barGap:   CGFloat = 4
                        let totalW    = CGFloat(barCount) * (barWidth + barGap)
                        let startX    = ccx - totalW / 2

                        for i in 0..<barCount {
                            let s   = seeds[i]
                            let fi  = Double(i)
                            let v1  = sin(t * s.freq1 + s.phase1 + fi * 0.3) * s.amp1
                            let v2  = sin(t * s.freq2 + s.phase2 + fi * 0.7) * s.amp2
                            let v3  = cos(t * s.freq3 + s.phase3 + fi * 0.15) * s.amp3
                            let env = 0.5 + 0.5 * sin(t * 0.8 + fi * 0.12)
                            let amplitude = min(abs(v1 + v2 + v3) * env, 1.0)

                            let barH  = max(amplitude * 90, 4)
                            let x     = startX + CGFloat(i) * (barWidth + barGap)
                            let alpha = 0.3 + amplitude * 0.6
                            let rect  = CGRect(x: x, y: ccy - CGFloat(barH) / 2,
                                               width: barWidth, height: CGFloat(barH))
                            ctx.fill(Path(RoundedRectangle(cornerRadius: 1.5).path(in: rect)),
                                     with: .color(Theme.Colors.brand.opacity(alpha)))
                        }
                    }
                }

                // Avatars with bob animation
                TimelineView(.animation) { tl in
                    let t = tl.date.timeIntervalSinceReferenceDate
                    ZStack {
                        ForEach(0..<avatarOffsets.count, id: \.self) { i in
                            let (ox, oy) = avatarOffsets[i]
                            let bob = CGFloat(sin(t * 1.5 + Double(i) * 2.1) * 4)
                            ZStack {
                                Circle()
                                    .fill(avatarColors[i])
                                    .frame(width: 56, height: 56)
                                Circle()
                                    .strokeBorder(Theme.Colors.brand, lineWidth: 2)
                                    .frame(width: 56, height: 56)
                            }
                            .position(x: cx + ox, y: cy + oy + bob)
                        }
                    }
                }

                // Caption bubbles (SwiftUI, not canvas)
                ZStack {
                    ForEach(0..<4, id: \.self) { i in
                        let (ox, oy) = avatarOffsets[i]
                        let text = captionPool[bubbleIndices[i]]
                        Text(text)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Theme.Colors.brand)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(
                                Capsule()
                                    .fill(Color(red: 30/255, green: 30/255, blue: 30/255).opacity(0.92))
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(Theme.Colors.brand.opacity(0.35), lineWidth: 1)
                                    )
                            )
                            .position(x: cx + ox, y: cy + oy - 42)
                    }
                }
            }
        }
        .frame(height: 270)
        .onAppear {
            guard seeds.isEmpty else { return }
            seeds = (0..<64).map { _ in
                WaveformBarSeed(
                    freq1:  Double.random(in: 1.5...5.5),
                    freq2:  Double.random(in: 3.0...9.0),
                    freq3:  Double.random(in: 0.5...2.5),
                    phase1: Double.random(in: 0...(2 * .pi)),
                    phase2: Double.random(in: 0...(2 * .pi)),
                    phase3: Double.random(in: 0...(2 * .pi)),
                    amp1:   Double.random(in: 0.3...0.7),
                    amp2:   Double.random(in: 0.15...0.35),
                    amp3:   Double.random(in: 0.05...0.2)
                )
            }
        }
    }
}

// MARK: - ClipIconShape

struct ClipIconShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width  / 73.9
        let sy = rect.height / 81.45
        var p  = Path()

        // p1
        p.move(to:    CGPoint(x: 3.686  * sx, y: 35.138 * sy))
        p.addCurve(to: CGPoint(x: 5.717 * sx, y: 30.333 * sy),
                   control1: CGPoint(x: 4.232 * sx, y: 33.487 * sy),
                   control2: CGPoint(x: 4.911 * sx, y: 31.881 * sy))
        // p2
        p.move(to:    CGPoint(x: 2.268  * sx, y: 49.8   * sy))
        p.addLine(to: CGPoint(x: 2.0    * sx, y: 45.576 * sy))
        p.addLine(to: CGPoint(x: 2.159  * sx, y: 42.322 * sy))
        // p3
        p.move(to:    CGPoint(x: 7.395  * sx, y: 63.701 * sy))
        p.addCurve(to: CGPoint(x: 4.121 * sx, y: 57.248 * sy),
                   control1: CGPoint(x: 6.071 * sx, y: 61.669 * sy),
                   control2: CGPoint(x: 4.973 * sx, y: 59.506 * sy))
        // p4
        p.move(to:    CGPoint(x: 18.168 * sx, y: 74.219 * sy))
        p.addCurve(to: CGPoint(x: 12.319 * sx, y: 69.693 * sy),
                   control1: CGPoint(x: 16.058 * sx, y: 72.917 * sy),
                   control2: CGPoint(x: 14.097 * sx, y: 71.4   * sy))
        // p5
        p.move(to:    CGPoint(x: 32.993 * sx, y: 79.302 * sy))
        p.addCurve(to: CGPoint(x: 25.578 * sx, y: 77.677 * sy),
                   control1: CGPoint(x: 30.468 * sx, y: 79.025 * sy),
                   control2: CGPoint(x: 27.981 * sx, y: 78.48  * sy))
        // p6 main arc
        p.move(to:    CGPoint(x: 29.186 * sx, y: 11.428 * sy))
        p.addLine(to: CGPoint(x: 36.954 * sx, y: 11.428 * sy))
        p.addCurve(to: CGPoint(x: 40.818 * sx, y: 79.31  * sy),
                   control1: CGPoint(x: 55.529 * sx, y: 11.481 * sy),
                   control2: CGPoint(x: 70.839 * sx, y: 25.59  * sy))
        // p7 arrow
        p.move(to:    CGPoint(x: 42.78  * sx, y: 2.0    * sy))
        p.addLine(to: CGPoint(x: 29.186 * sx, y: 11.428 * sy))
        p.addLine(to: CGPoint(x: 42.78  * sx, y: 20.856 * sy))

        return p
    }
}

// MARK: - Confetti Particle

private struct TutorialConfettiParticle {
    let angle:    Double
    let speed:    Double
    let size:     CGFloat
    let hue:      Double
    let rotSpeed: Double
}

// MARK: - BurstAnimPhase

private enum BurstAnimPhase {
    case idle
    case press(Double)
    case celebrate(Double)
    case windDown(Double)
}

// MARK: - ILLUSTRATION 2: ClipButtonBurstIllustration

struct ClipButtonBurstIllustration: View {

    @State private var animPhase: BurstAnimPhase = .idle
    @State private var cycleTimer: Timer?
    @State private var confettiParticles: [TutorialConfettiParticle] = []

    var body: some View {
        GeometryReader { geo in
            let sz = geo.size
            let s  = min(sz.width, sz.height) / 320.0

            ZStack {
                TimelineView(.animation) { tl in
                    Canvas { ctx, canvasSize in
                        let t  = tl.date.timeIntervalSinceReferenceDate
                        let cx = canvasSize.width  / 2
                        let cy = canvasSize.height / 2

                        let (intensity, celebrating, celebProgress) = phaseValues()

                        // 6 circular waveform rings
                        for ring in 0..<6 {
                            let innerR = 48.0 * s
                            let outerR = 160.0 * s
                            let baseR  = innerR + (outerR - innerR) * Double(ring) / 5.0
                            let segCount = 64
                            var ringPath = Path()
                            for seg in 0...segCount {
                                let angle = Double(seg) / Double(segCount) * .pi * 2
                                let d1 = sin(angle * 4 + t * 4.0 + Double(ring) * 0.4) * 3.0 * Double(s)
                                let d2 = sin(angle * 7 + t * 6.0 + Double(ring) * 0.7) * 1.5 * Double(s)
                                let r  = baseR + d1 + d2
                                let px = cx + CGFloat(cos(angle) * r)
                                let py = cy + CGFloat(sin(angle) * r)
                                if seg == 0 { ringPath.move(to: CGPoint(x: px, y: py)) }
                                else        { ringPath.addLine(to: CGPoint(x: px, y: py)) }
                            }
                            let alpha  = (1.0 - Double(ring) / 7.0) * (0.12 + intensity * 0.2)
                            let blend  = Double(ring) / 5.0
                            let rColor = Color(hue: (80 + blend * 30) / 360.0,
                                               saturation: 0.9, brightness: 0.9, opacity: alpha)
                            ctx.stroke(ringPath, with: .color(rColor),
                                       style: StrokeStyle(lineWidth: 1.5 * s))
                        }

                        // 48 radiating bars
                        for i in 0..<48 {
                            let angle  = Double(i) / 48.0 * .pi * 2
                            let fi     = Double(i)
                            let barAmp = abs(
                                sin(t * 1.2 + fi * 0.3) * 0.5 +
                                sin(t * 0.8 + fi * 0.7) * 0.3 +
                                cos(t * 0.5 + fi * 0.15) * 0.2
                            ) * intensity
                            let innerR = 50.0 * s
                            let maxLen = 35.0 * s
                            let barLen = maxLen * CGFloat(barAmp)
                            let x1 = cx + CGFloat(cos(angle)) * innerR
                            let y1 = cy + CGFloat(sin(angle)) * innerR
                            let x2 = cx + CGFloat(cos(angle)) * (innerR + barLen)
                            let y2 = cy + CGFloat(sin(angle)) * (innerR + barLen)
                            let r   = 218.0 * (1 - barAmp * 0.5)
                            let g   = 252.0 * (1 - barAmp * 0.3) + 200.0 * barAmp * 0.3
                            let b   = 121.0 * (1 - barAmp * 0.6) + 255.0 * barAmp * 0.6
                            let barColor = Color(red: r/255, green: g/255, blue: b/255,
                                                  opacity: 0.3 + barAmp * 0.5)
                            var bp = Path()
                            bp.move(to: CGPoint(x: x1, y: y1))
                            bp.addLine(to: CGPoint(x: x2, y: y2))
                            ctx.stroke(bp, with: .color(barColor),
                                       style: StrokeStyle(lineWidth: 2.5 * s, lineCap: .round))
                        }

                        // Press squish on center circle
                        let pressScaleY: Double = {
                            if case .press(let p) = animPhase {
                                return 1.0 - sin(p * .pi) * 0.18
                            }
                            return 1.0
                        }()
                        let circleR  = 46.0 * s
                        let circleRy = circleR * CGFloat(pressScaleY)
                        let circleRect = CGRect(x: cx - circleR, y: cy - circleRy,
                                                width: circleR * 2, height: circleRy * 2)
                        ctx.fill(Path(ellipseIn: circleRect), with: .color(Theme.Colors.brand))

                        if celebrating {
                            // Checkmark
                            let checkP = min(celebProgress * 2.5, 1.0)
                            if checkP > 0 {
                                let p0 = CGPoint(x: cx - 12 * s, y: cy - 1  * s)
                                let p1 = CGPoint(x: cx - 3  * s, y: cy + 9  * s)
                                let p2 = CGPoint(x: cx + 14 * s, y: cy - 8  * s)
                                var ck = Path()
                                ck.move(to: p0)
                                if checkP < 0.5 {
                                    let lp = checkP / 0.5
                                    ck.addLine(to: CGPoint(x: p0.x + (p1.x - p0.x) * lp,
                                                           y: p0.y + (p1.y - p0.y) * lp))
                                } else {
                                    ck.addLine(to: p1)
                                    let lp = (checkP - 0.5) / 0.5
                                    ck.addLine(to: CGPoint(x: p1.x + (p2.x - p1.x) * lp,
                                                           y: p1.y + (p2.y - p1.y) * lp))
                                }
                                ctx.stroke(ck, with: .color(.black),
                                           style: StrokeStyle(lineWidth: 3.5 * s,
                                                             lineCap: .round, lineJoin: .round))
                            }

                            // Confetti
                            if !confettiParticles.isEmpty && celebProgress > 0 {
                                for particle in confettiParticles {
                                    let elapsed = celebProgress * 2.5
                                    let px = cx + CGFloat(cos(particle.angle) * particle.speed * elapsed * 90 * Double(s))
                                    let gravity = 0.3 * pow(elapsed, 2) * 20.0 * Double(s)
                                    let py = cy + CGFloat(sin(particle.angle) * particle.speed * elapsed * 90 * Double(s)) + CGFloat(gravity)
                                    let alpha  = max(0, 1.0 - celebProgress)
                                    let pColor = Color(hue: particle.hue / 360.0,
                                                       saturation: 0.9, brightness: 0.95, opacity: alpha)
                                    let pRect  = CGRect(x: px - particle.size / 2, y: py - particle.size / 2,
                                                        width: particle.size, height: particle.size)
                                    ctx.fill(Path(ellipseIn: pRect), with: .color(pColor))
                                }
                            }

                            // "Last 2 min saved!" label
                            if celebProgress > 0.16 {
                                let textAlpha = min((celebProgress - 0.16) / 0.25, 1.0)
                                let textY     = cy + circleRy + 22 * s
                                let attrs = AttributeContainer()
                                    .foregroundColor(Theme.Colors.brand.opacity(textAlpha))
                                    .font(.system(size: 14, weight: .bold))
                                ctx.draw(Text(AttributedString("Last 2 min saved!", attributes: attrs)),
                                         at: CGPoint(x: cx, y: textY))
                            }

                        } else {
                            // Clip icon
                            let iconW    = 36.0 * s
                            let iconH    = iconW * (81.45 / 73.9)
                            let iconRect = CGRect(x: cx - iconW * 0.45, y: cy - iconH * 0.5,
                                                  width: iconW * 0.9, height: iconH)
                            let iconPath = ClipIconShape().path(in: iconRect)
                            ctx.stroke(iconPath, with: .color(.black),
                                       style: StrokeStyle(lineWidth: max(2, 3.5 * s),
                                                         lineCap: .round, lineJoin: .round))
                        }
                    }
                }
            }
            .onAppear {
                confettiParticles = (0..<30).map { _ in
                    TutorialConfettiParticle(
                        angle:    Double.random(in: 0...(2 * .pi)),
                        speed:    Double.random(in: 0.5...2.0),
                        size:     CGFloat.random(in: 4...10) * s,
                        hue:      [70, 80, 100, 110, 180, 190].randomElement()!,
                        rotSpeed: Double.random(in: -4...4)
                    )
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    startCycle()
                }
            }
            .onDisappear {
                cycleTimer?.invalidate()
            }
        }
        .frame(height: 280)
    }

    private func phaseValues() -> (Double, Bool, Double) {
        switch animPhase {
        case .idle:             return (0.45, false, 0)
        case .press(let p):     return (0.45 + p * 0.55, false, 0)
        case .celebrate(let p): return (1.0, true, p)
        case .windDown(let p):  return (1.0 - p * 0.6, false, 0)
        }
    }

    private func startCycle() {
        cycleTimer?.invalidate()
        animPhase = .idle
        var tick = 0
        let tickInterval: TimeInterval = 1.0 / 60.0
        let pressDuration     = 0.6
        let celebrateDuration = 2.5
        let windDownDuration  = 1.5
        let totalDuration     = pressDuration + celebrateDuration + windDownDuration

        cycleTimer = Timer.scheduledTimer(withTimeInterval: tickInterval, repeats: true) { timer in
            tick += 1
            let elapsed = Double(tick) * tickInterval
            if elapsed < pressDuration {
                animPhase = .press(elapsed / pressDuration)
            } else if elapsed < pressDuration + celebrateDuration {
                let p = (elapsed - pressDuration) / celebrateDuration
                animPhase = .celebrate(min(p, 1.0))
            } else if elapsed < totalDuration {
                let p = (elapsed - pressDuration - celebrateDuration) / windDownDuration
                animPhase = .windDown(min(p, 1.0))
            } else {
                timer.invalidate()
                animPhase = .idle
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                    startCycle()
                }
            }
        }
    }
}

// MARK: - ILLUSTRATION 3: ShareMomentIllustration

struct ShareMomentIllustration: View {

    private let baseAngles: [Double] = [-90, -30, 30, 90, 150, 210]
    private let avatarColors: [Color] = [
        Color(hex: "#4A90D9"), Color(hex: "#7B4EA0"),
        Color(hex: "#E07B3C"), Color(hex: "#C0392B"),
        Color(hex: "#27AE60"), Color(hex: "#8E44AD")
    ]
    private let emojiPool = ["😂","🔥","❤️","😮","💀","🤣","😭","🫠","💯","👀","🤯","😤","🥹","✨","💜"]
    private let avatarInitials = ["SL", "YK", "DJ", "PM", "BW", "NR"]

    @State private var currentEmojis: [String] = []
    @State private var emojiCycleTimer: Timer?

    var body: some View {
        GeometryReader { geo in
            let sz = geo.size
            let s  = min(sz.width, sz.height) / 320.0
            let cx = sz.width  / 2
            let cy = sz.height / 2

            ZStack {
                // Canvas layer
                TimelineView(.animation) { tl in
                    Canvas { ctx, canvasSize in
                        let t       = tl.date.timeIntervalSinceReferenceDate
                        let ccx     = canvasSize.width  / 2
                        let ccy     = canvasSize.height / 2
                        let orbitR  = 105.0 * s
                        let yFactor = 0.6
                        let rotSpeed = 10.0 * .pi / 180.0

                        // 2 expanding cyan pulse rings
                        for ring in 0..<2 {
                            let phase  = fmod(t * 0.35 + Double(ring) * 0.5, 1.0)
                            let radius = CGFloat(30.0 * Double(s) + phase * 80.0 * Double(s))
                            let alpha  = (1.0 - phase) * 0.15
                            let pRect  = CGRect(x: ccx - radius, y: ccy - radius,
                                               width: radius * 2, height: radius * 2)
                            ctx.stroke(Path(ellipseIn: pRect),
                                       with: .color(Theme.Colors.accent.opacity(alpha)),
                                       lineWidth: 1.5 * s)
                        }

                        // Center waveform: 48 bars
                        for i in 0..<48 {
                            let angle  = Double(i) / 48.0 * .pi * 2
                            let fi     = Double(i)
                            let barAmp = abs(
                                sin(t * 1.1 + fi * 0.25) * 0.45 +
                                sin(t * 0.75 + fi * 0.6)  * 0.35 +
                                cos(t * 0.5  + fi * 0.18) * 0.2
                            )
                            let innerR = 30.0 * s
                            let maxLen = 35.0 * s
                            let barLen = maxLen * CGFloat(barAmp)
                            let x1 = ccx + CGFloat(cos(angle)) * innerR
                            let y1 = ccy + CGFloat(sin(angle)) * innerR
                            let x2 = ccx + CGFloat(cos(angle)) * (innerR + barLen)
                            let y2 = ccy + CGFloat(sin(angle)) * (innerR + barLen)
                            let r  = 218.0 * (1 - barAmp * 0.5)
                            let g  = 252.0 * (1 - barAmp * 0.3) + 200.0 * barAmp * 0.3
                            let b  = 121.0 * (1 - barAmp * 0.6) + 255.0 * barAmp * 0.6
                            let bColor = Color(red: r/255, green: g/255, blue: b/255,
                                               opacity: 0.4 + barAmp * 0.5)
                            var bp = Path()
                            bp.move(to: CGPoint(x: x1, y: y1))
                            bp.addLine(to: CGPoint(x: x2, y: y2))
                            ctx.stroke(bp, with: .color(bColor),
                                       style: StrokeStyle(lineWidth: 2.5 * s, lineCap: .round))
                        }

                        // Dashed connecting lines center → avatars
                        let rotOff = t * rotSpeed
                        for i in 0..<6 {
                            let angle = (baseAngles[i] * .pi / 180.0) + rotOff
                            let ax = ccx + CGFloat(cos(angle) * orbitR)
                            let ay = ccy + CGFloat(sin(angle) * orbitR * yFactor)
                            let la = 0.08 + sin(t * 1.5 + Double(i)) * 0.04
                            var lp = Path()
                            lp.move(to: CGPoint(x: ccx, y: ccy))
                            lp.addLine(to: CGPoint(x: ax, y: ay))
                            ctx.stroke(lp, with: .color(Theme.Colors.brand.opacity(la)),
                                       style: StrokeStyle(lineWidth: 1 * s, dash: [4 * s, 4 * s]))
                        }

                        // 10 clip transfers along bezier curves
                        for i in 0..<10 {
                            let cycleLen: Double = 13.0
                            let offsetT  = fmod(t + Double(i) * 1.3, cycleLen)
                            let progress = min(offsetT / 1.0, 1.0)

                            let fromIdx = i % 6
                            let toIdx   = (i + 2) % 6
                            let fromAngle = (baseAngles[fromIdx] * .pi / 180.0) + rotOff
                            let toAngle   = (baseAngles[toIdx]   * .pi / 180.0) + rotOff

                            let fx = ccx + CGFloat(cos(fromAngle) * orbitR)
                            let fy = ccy + CGFloat(sin(fromAngle) * orbitR * yFactor)
                            let tx = ccx + CGFloat(cos(toAngle)   * orbitR)
                            let ty = ccy + CGFloat(sin(toAngle)   * orbitR * yFactor)

                            let p  = CGFloat(progress)
                            let px = (1-p)*(1-p)*fx + 2*(1-p)*p*ccx + p*p*tx
                            let py = (1-p)*(1-p)*fy + 2*(1-p)*p*ccy + p*p*ty

                            let dotAlpha = sin(progress * .pi)
                            let dotR     = 5.0 * s
                            let dotRect  = CGRect(x: px - dotR, y: py - dotR,
                                                  width: dotR*2, height: dotR*2)
                            ctx.fill(Path(ellipseIn: dotRect),
                                     with: .color(Theme.Colors.brand.opacity(dotAlpha * 0.9)))

                            // 6 trailing dots
                            for td in 1...6 {
                                let trailP    = max(0, progress - Double(td) * 0.05)
                                let tp2       = CGFloat(trailP)
                                let tpx       = (1-tp2)*(1-tp2)*fx + 2*(1-tp2)*tp2*ccx + tp2*tp2*tx
                                let tpy       = (1-tp2)*(1-tp2)*fy + 2*(1-tp2)*tp2*ccy + tp2*tp2*ty
                                let trailAlpha = dotAlpha * (1.0 - Double(td) / 6.0) * 0.5
                                let trailR     = dotR * CGFloat(1.0 - Double(td) / 8.0)
                                let trailRect  = CGRect(x: tpx - trailR, y: tpy - trailR,
                                                        width: trailR*2, height: trailR*2)
                                ctx.fill(Path(ellipseIn: trailRect),
                                         with: .color(Theme.Colors.brand.opacity(trailAlpha)))
                            }
                        }

                        // 6 avatar circles
                        for i in 0..<6 {
                            let angle    = (baseAngles[i] * .pi / 180.0) + rotOff
                            let ax       = ccx + CGFloat(cos(angle) * orbitR)
                            let ay       = ccy + CGFloat(sin(angle) * orbitR * yFactor)
                            let diameter = 44.0 * s
                            let aRect    = CGRect(x: ax - diameter/2, y: ay - diameter/2,
                                                  width: diameter, height: diameter)
                            ctx.fill(Path(ellipseIn: aRect), with: .color(avatarColors[i]))
                            ctx.stroke(Path(ellipseIn: aRect), with: .color(Theme.Colors.brand),
                                       style: StrokeStyle(lineWidth: 2 * s))
                        }
                    }
                }

                // Emoji overlays (SwiftUI Text)
                TimelineView(.animation) { tl in
                    let t        = tl.date.timeIntervalSinceReferenceDate
                    let rotOff   = t * 10.0 * .pi / 180.0
                    let orbitR   = 105.0 * s
                    let yFactor  = 0.6

                    ForEach(0..<6, id: \.self) { i in
                        let angle  = (baseAngles[i] * .pi / 180.0) + rotOff
                        let ax     = cx + CGFloat(cos(angle) * orbitR)
                        let ay     = cy + CGFloat(sin(angle) * orbitR * yFactor)
                        let floatY = CGFloat(sin(t * 2.0 + Double(i) * 1.3) * 3.0)

                        ZStack {
                            Text(avatarInitials[i])
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .position(x: ax, y: ay)

                            Text(currentEmojis.indices.contains(i) ? currentEmojis[i] : "😂")
                                .font(.system(size: 16))
                                .position(x: ax, y: ay - 32 * s + floatY)
                        }
                    }
                }
            }
        }
        .frame(height: 280)
        .onAppear {
            if currentEmojis.isEmpty {
                currentEmojis = (0..<6).map { _ in emojiPool.randomElement()! }
            }
            emojiCycleTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { _ in
                let idx = Int.random(in: 0..<6)
                if idx < currentEmojis.count {
                    currentEmojis[idx] = emojiPool.randomElement()!
                }
            }
        }
        .onDisappear {
            emojiCycleTimer?.invalidate()
        }
    }
}

// MARK: - TutorialContinueButton

private struct TutorialContinueButton: View {
    let page:   Int
    let action: () -> Void

    @State private var buttonFilled: Bool  = false
    @State private var fillTimer:    Timer?

    private var isLastPage: Bool { page == 2 }

    var body: some View {
        Button(action: action) {
            Text(isLastPage ? "Get Started >" : "Continue >")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(isLastPage ? Theme.Colors.brand : (buttonFilled ? .black : Theme.Colors.brand))
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(
                    Capsule()
                        .fill(isLastPage
                            ? Color.white.opacity(0.08)
                            : (buttonFilled ? Theme.Colors.brand : Color.clear))
                )
                .overlay(
                    Capsule()
                        .strokeBorder(
                            Theme.Colors.brand.opacity(
                                isLastPage ? 1.0 : (buttonFilled ? 0.0 : 0.35)
                            ),
                            lineWidth: 1.5
                        )
                )
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: buttonFilled)
        .onChange(of: page) { _ in
            resetFill()
        }
        .onAppear { startFillTimer() }
        .onDisappear { fillTimer?.invalidate() }
    }

    private func startFillTimer() {
        fillTimer?.invalidate()
        buttonFilled = false
        fillTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { _ in
            DispatchQueue.main.async {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                    buttonFilled = true
                }
            }
        }
    }

    private func resetFill() {
        fillTimer?.invalidate()
        buttonFilled = false
        startFillTimer()
    }
}

// MARK: - TutorialProgressDots

private struct TutorialProgressDots: View {
    let current: Int
    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { i in
                if i == current {
                    Capsule()
                        .fill(Theme.Colors.brand)
                        .frame(width: 28, height: 8)
                } else {
                    Capsule()
                        .fill(Theme.Colors.muted.opacity(0.3))
                        .frame(width: 8, height: 8)
                }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: current)
    }
}

// MARK: - TutorialPageView

private struct TutorialPageView: View {
    let caption:      String
    let title:        String
    let illustration: AnyView

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 8)

            Text(caption)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.Colors.accent)
                .kerning(3)
                .multilineTextAlignment(.center)
                .padding(.bottom, 20)

            illustration
                .padding(.horizontal, 8)

            Spacer(minLength: 12)

            Text(title)
                .font(.system(size: 48, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

            Spacer(minLength: 8)
        }
    }
}

// MARK: - TutorialView

struct TutorialView: View {
    var onComplete: () -> Void = {}

    @State private var currentStep: Int = 0

    private struct PageData {
        let caption:      String
        let title:        String
        let illustration: AnyView
    }

    private let pages: [PageData] = [
        PageData(
            caption:      "ALWAYS LISTENING",
            title:        "ALWAYS HAVE THE RECEIPTS 🧾",
            illustration: AnyView(WaveformPeopleIllustration())
        ),
        PageData(
            caption:      "JUST TAP 🔄",
            title:        "TAP TO SAVE THE PAST",
            illustration: AnyView(ClipButtonBurstIllustration())
        ),
        PageData(
            caption:      "MOMENTS WITH FRIENDS",
            title:        "🎉 SHARE YOUR CLIPS WITH FRIENDS",
            illustration: AnyView(ShareMomentIllustration())
        )
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {

                // Header
                HStack {
                    ReclipLogoView()
                        .padding(.leading, 20)
                    Spacer()
                    Button("Skip") {
                        HapticsManager.shared.light()
                        onComplete()
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.Colors.muted)
                    .padding(.trailing, 20)
                }
                .padding(.top, 8)
                .frame(height: 52)

                // Page carousel
                TabView(selection: $currentStep) {
                    ForEach(pages.indices, id: \.self) { i in
                        TutorialPageView(
                            caption:      pages[i].caption,
                            title:        pages[i].title,
                            illustration: pages[i].illustration
                        )
                        .tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .gesture(
                    DragGesture(minimumDistance: 50)
                        .onEnded { value in
                            if value.translation.width < -50, currentStep < pages.count - 1 {
                                HapticsManager.shared.medium()
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    currentStep += 1
                                }
                            } else if value.translation.width > 50, currentStep > 0 {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    currentStep -= 1
                                }
                            }
                        }
                )

                // Bottom controls
                VStack(spacing: 20) {
                    TutorialProgressDots(current: currentStep)

                    TutorialContinueButton(page: currentStep) {
                        if currentStep < pages.count - 1 {
                            HapticsManager.shared.medium()
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                currentStep += 1
                            }
                        } else {
                            HapticsManager.shared.success()
                            onComplete()
                        }
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 44)
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TutorialView_Previews: PreviewProvider {
    static var previews: some View {
        TutorialView()
            .preferredColorScheme(.dark)
    }
}
#endif
