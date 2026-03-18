import SwiftUI

struct TutorialView: View {
    var onComplete: () -> Void

    @State private var currentStep = 0
    @State private var demoLevels: [Float] = Array(repeating: 0, count: 64)
    @State private var demoActive = false
    @State private var levelTimer: Timer?

    private let steps: [(icon: String, title: String, body: String)] = [
        ("mic.circle.fill",
         "Always Recording",
         "Reclip runs a silent 2-minute rolling buffer in the background. You never miss a moment."),
        ("scissors",
         "Clip Any Moment",
         "Tap Clip to instantly save the last few seconds as a shareable audio snippet."),
        ("waveform",
         "Trim to Perfection",
         "Use the waveform editor to trim the exact start and end of your clip."),
        ("person.2.fill",
         "Share with Friends",
         "Send your clips to your inner circle and build your Reclip feed together."),
    ]

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
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                Spacer()

                // Demo waveform
                CircularWaveformView(
                    levels: demoLevels,
                    isActive: demoActive,
                    size: 220
                )
                .padding(.bottom, 40)

                // Step content
                TabView(selection: $currentStep) {
                    ForEach(0..<steps.count, id: \.self) { i in
                        stepCard(steps[i]).tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 200)

                // Page dots
                HStack(spacing: 8) {
                    ForEach(0..<steps.count, id: \.self) { i in
                        Capsule()
                            .fill(i == currentStep ? accentColor : Color.white.opacity(0.3))
                            .frame(width: i == currentStep ? 20 : 8, height: 8)
                            .animation(.spring(response: 0.3), value: currentStep)
                    }
                }
                .padding(.vertical, 20)

                // Next / Get Started button
                PrimaryButton(
                    label: currentStep < steps.count - 1 ? "Next" : "Get Started",
                    systemImage: currentStep < steps.count - 1 ? "arrow.right" : "mic.fill"
                ) {
                    if currentStep < steps.count - 1 {
                        withAnimation { currentStep += 1 }
                        HapticsManager.shared.light()
                    } else {
                        HapticsManager.shared.success()
                        onComplete()
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
        }
        .onAppear { startDemo() }
        .onDisappear { levelTimer?.invalidate() }
    }

    @ViewBuilder
    private func stepCard(_ step: (icon: String, title: String, body: String)) -> some View {
        VStack(spacing: 16) {
            Image(systemName: step.icon)
                .font(.system(size: 36, weight: .medium))
                .foregroundColor(accentColor)

            Text(step.title)
                .font(.system(size: 26, weight: .black))
                .foregroundColor(.white)

            Text(step.body)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.65))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
    }

    private func startDemo() {
        demoActive = true
        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { _ in
            Task { @MainActor in
                var newLevels = demoLevels
                newLevels.removeFirst()
                newLevels.append(Float.random(in: 0.1...0.9))
                demoLevels = newLevels
            }
        }
    }

    private func skipTutorial() {
        HapticsManager.shared.light()
        onComplete()
    }
}

// MARK: - Reclip Logo
struct ReclipLogoView: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Color(hex: "#DAFC79"))
            Text("reclip")
                .font(.system(size: 22, weight: .black))
                .foregroundColor(.white)
        }
    }
}
