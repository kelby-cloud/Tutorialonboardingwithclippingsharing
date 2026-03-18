import SwiftUI

struct TutorialView: View {
    var onComplete: () -> Void

    @State private var currentStep = 0
    @State private var demoLevels: [Float] = Array(repeating: 0.3, count: 64)
    @State private var levelTimer: Timer?
    @State private var sweepAngle: Double = 0

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    ReclipLogoView()
                    Spacer()
                    Button(action: skipTutorial) {
                        Text("Skip")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                // Slide content
                TabView(selection: $currentStep) {
                    slide1.tag(0)
                    slide2.tag(1)
                    slide3.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(maxHeight: .infinity)

                // Page dots
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { i in
                        Capsule()
                            .fill(i == currentStep ? accentColor : Color.white.opacity(0.3))
                            .frame(width: i == currentStep ? 28 : 8, height: 8)
                            .animation(.spring(response: 0.3), value: currentStep)
                    }
                }
                .padding(.bottom, 20)

                // Action button
                actionButton
                    .padding(.horizontal, 24)
                    .padding(.bottom, 44)
            }
        }
        .onAppear { startAnimations() }
        .onDisappear { levelTimer?.invalidate() }
    }

    // MARK: - Slide 1: Always Listening

    private var slide1: some View {
        VStack(spacing: 0) {
            Text("ALWAYS LISTENING")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(accentColor)
                .kerning(3)
                .padding(.top, 28)

            ZStack {
                // Horizontal waveform bars
                HStack(spacing: 4) {
                    ForEach(Array(demoLevels.prefix(36).enumerated()), id: \.offset) { i, level in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(accentColor.opacity(0.4 + Double(level) * 0.6))
                            .frame(width: 4, height: max(6, CGFloat(level) * 95))
                    }
                }

                // Friend avatar circles
                avatarCircle(color: Color(hex: "#4A90D9"), size: 58, x: -120, y: -12)
                avatarCircle(color: Color(hex: "#7B4EA0"), size: 50, x: 2, y: -58)
                avatarCircle(color: Color(hex: "#E07B3C"), size: 50, x: 122, y: -22)
                avatarCircle(color: Color(hex: "#C0392B"), size: 46, x: 40, y: 66)

                // Chat bubbles
                chatBubble("Clip that 🔥").offset(x: -75, y: -95)
                chatBubble("not him saying that...").offset(x: 52, y: -105)
                chatBubble("Yoo!! clip that 😂").offset(x: -8, y: -32)
                chatBubble("say that again...").offset(x: 12, y: 28)
            }
            .frame(height: 248)

            Text("ALWAYS\nHAVE THE\nRECEIPTS 🧾")
                .font(.system(size: 48, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            Spacer()
        }
    }

    // MARK: - Slide 2: Just Tap

    private var slide2: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Text("JUST TAP")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(accentColor)
                    .kerning(3)
                Text("🔄")
                    .font(.system(size: 13))
            }
            .padding(.top, 28)

            // Large circular tap-button illustration
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.05), lineWidth: 1)
                    .frame(width: 240, height: 240)
                Circle()
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    .frame(width: 200, height: 200)

                // Waveform tick marks + sweep line
                Canvas { context, size in
                    let center = CGPoint(x: size.width / 2, y: size.height / 2)
                    let radius: CGFloat = 88
                    let count = 60
                    for i in 0..<count {
                        let angle = (Double(i) / Double(count)) * 2 * .pi - .pi / 2
                        let level = Double(demoLevels[i % demoLevels.count])
                        let innerR = radius - 4
                        let outerR = radius + level * 24
                        let s = CGPoint(x: center.x + cos(angle) * innerR, y: center.y + sin(angle) * innerR)
                        let e = CGPoint(x: center.x + cos(angle) * outerR, y: center.y + sin(angle) * outerR)
                        var p = Path()
                        p.move(to: s)
                        p.addLine(to: e)
                        context.stroke(p, with: .color(Color(hex: "#DAFC79").opacity(0.75)), lineWidth: 2)
                    }
                    // Blue sweep line
                    let sa = sweepAngle * 2 * .pi - .pi / 2
                    var sweep = Path()
                    sweep.move(to: center)
                    sweep.addLine(to: CGPoint(
                        x: center.x + cos(sa) * radius,
                        y: center.y + sin(sa) * radius
                    ))
                    context.stroke(sweep, with: .color(Color(red: 0.25, green: 0.65, blue: 1.0)), lineWidth: 2.5)
                }
                .frame(width: 220, height: 220)

                // Lime green center circle
                Circle()
                    .fill(accentColor)
                    .frame(width: 92, height: 92)
                    .shadow(color: accentColor.opacity(0.55), radius: 24)

                Image(systemName: "checkmark")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundColor(.black)
            }
            .frame(height: 248)

            Text("TAP TO SAVE\nTHE PAST")
                .font(.system(size: 48, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            Spacer()
        }
    }

    // MARK: - Slide 3: Moments with Friends

    private var slide3: some View {
        VStack(spacing: 0) {
            Text("MOMENTS WITH FRIENDS")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(accentColor)
                .kerning(3)
                .padding(.top, 28)

            ZStack {
                // Center waveform ring
                Canvas { context, size in
                    let center = CGPoint(x: size.width / 2, y: size.height / 2)
                    let radius: CGFloat = 42
                    let count = 36
                    for i in 0..<count {
                        let angle = (Double(i) / Double(count)) * 2 * .pi
                        let level = Double(demoLevels[i % demoLevels.count])
                        let s = CGPoint(x: center.x + cos(angle) * (radius - 4), y: center.y + sin(angle) * (radius - 4))
                        let e = CGPoint(x: center.x + cos(angle) * (radius + level * 18), y: center.y + sin(angle) * (radius + level * 18))
                        var p = Path()
                        p.move(to: s)
                        p.addLine(to: e)
                        context.stroke(p, with: .color(Color(hex: "#DAFC79").opacity(0.7)), lineWidth: 2)
                    }
                }
                .frame(width: 110, height: 110)

                Circle()
                    .fill(Color.black)
                    .frame(width: 80, height: 80)
                    .overlay(Circle().stroke(accentColor.opacity(0.3), lineWidth: 1))

                // Friend avatars
                avatarCircle(color: Color(hex: "#5D4037"), size: 52, x: -108, y: -22)
                avatarCircle(color: Color(hex: "#C0392B"), size: 48, x: -32, y: -92)
                avatarCircle(color: Color(hex: "#1565C0"), size: 48, x: 110, y: 10)
                avatarCircle(color: Color(hex: "#2E7D32"), size: 44, x: 52, y: 78)
                avatarCircle(color: Color(hex: "#6A1B9A"), size: 44, x: -56, y: 78)

                // Emoji reactions
                Text("😯").font(.system(size: 22)).offset(x: -88, y: -68)
                Text("😊").font(.system(size: 22)).offset(x: 18, y: -112)
                Text("🤣").font(.system(size: 22)).offset(x: 140, y: -28)
                Text("😂").font(.system(size: 22)).offset(x: 92, y: 58)
                Text("💚").font(.system(size: 18)).offset(x: -88, y: 32)
            }
            .frame(height: 248)

            Text("🎉 SHARE\nYOUR CLIPS\nWITH FRIENDS")
                .font(.system(size: 48, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            Spacer()
        }
    }

    // MARK: - Action button

    @ViewBuilder
    private var actionButton: some View {
        if currentStep < 2 {
            Button(action: advanceStep) {
                HStack(spacing: 8) {
                    Text("Continue")
                        .font(.system(size: 18, weight: .bold))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(accentColor)
                .foregroundColor(.black)
                .clipShape(Capsule())
            }
        } else {
            Button(action: {
                HapticsManager.shared.success()
                onComplete()
            }) {
                HStack(spacing: 8) {
                    Text("Get Started")
                        .font(.system(size: 18, weight: .bold))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(Color(white: 0.08))
                .foregroundColor(accentColor)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(accentColor.opacity(0.7), lineWidth: 1.5))
            }
        }
    }

    // MARK: - Helper views

    private func avatarCircle(color: Color, size: CGFloat, x: CGFloat, y: CGFloat) -> some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .overlay(Circle().stroke(accentColor, lineWidth: 2))
            .offset(x: x, y: y)
    }

    private func chatBubble(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.12))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 0.5))
    }

    // MARK: - Actions

    private func advanceStep() {
        withAnimation(.spring(response: 0.4)) { currentStep += 1 }
        HapticsManager.shared.light()
    }

    private func skipTutorial() {
        HapticsManager.shared.light()
        onComplete()
    }

    private func startAnimations() {
        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { _ in
            Task { @MainActor in
                var newLevels = demoLevels
                newLevels.removeFirst()
                newLevels.append(Float.random(in: 0.15...0.95))
                demoLevels = newLevels
                sweepAngle = fmod(sweepAngle + 0.022, 1.0)
            }
        }
    }
}

// MARK: - Reclip Logo

struct ReclipLogoView: View {
    var body: some View {
        HStack(spacing: 0) {
            Text("R")
                .scaleEffect(x: -1, y: 1, anchor: .center)
            Text("ECLIP")
        }
        .font(.system(size: 26, weight: .black))
        .foregroundColor(.white)
    }
}
