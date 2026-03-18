import SwiftUI
import AVFoundation

struct RecordingView: View {
    @ObservedObject var recorder: AudioRecorderManager
    var onClipSaved: (URL, [CaptionSegment]) -> Void

    @State private var errorMessage: String?
    @State private var showToast = false
    @State private var toastMessage = ""
    @State private var sweepAngle: Double = 0
    @State private var sweepTimer: Timer?

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if !recorder.permissionGranted {
                prePermissionLayout
            } else {
                recordingLayout
            }

            ToastOverlay(isShowing: $showToast, message: toastMessage)
        }
        .animation(.easeInOut(duration: 0.3), value: recorder.permissionGranted)
        .animation(.easeInOut(duration: 0.2), value: recorder.isRecording)
        .onAppear { startSweep() }
        .onDisappear { sweepTimer?.invalidate() }
    }

    // MARK: - Pre-permission layout (Screen 4)

    private var prePermissionLayout: some View {
        VStack(spacing: 0) {
            // Centered logo
            ReclipLogoView()
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 20)

            Spacer()

            // Inactive waveform illustration
            inactiveWaveform
                .frame(height: 260)

            Spacer()

            // Title
            Text("CLIP IT\nBEFORE YOU\nMISS IT!")
                .font(.system(size: 52, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            // Subtitle
            Text("Save up to 2 mins of audio.\nThe jokes, The cap, The receipts. Clipped 🎤✨")
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.55))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .padding(.top, 16)

            Spacer()

            // Turn on your mic button
            Button(action: requestPermission) {
                HStack(spacing: 10) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 17))
                    Text("Turn on your mic")
                        .font(.system(size: 18, weight: .bold))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 15, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(accentColor)
                .foregroundColor(.black)
                .clipShape(Capsule())
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 44)
        }
    }

    // MARK: - Recording layout (Screen 5)

    private var recordingLayout: some View {
        VStack(spacing: 0) {
            // Centered logo
            ReclipLogoView()
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 20)

            // Lime green headline
            Text("SAY SOMETHING,\nANYTHING!")
                .font(.system(size: 44, weight: .black))
                .foregroundColor(accentColor)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
                .padding(.top, 20)

            // Recording status badge
            recordingBadge
                .padding(.top, 14)

            Spacer()

            // Large circular clip button
            largeCircularButton

            Spacer()

            // Bottom instruction
            HStack(spacing: 4) {
                Text("TAP")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.45))
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.45))
                Text("ABOVE TO")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.45))
                Text("CLIP")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(accentColor)
            }
            .padding(.bottom, 40)
        }
    }

    // MARK: - Inactive waveform (pre-permission illustration)

    private var inactiveWaveform: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.04), lineWidth: 1)
                .frame(width: 258, height: 258)
            Circle()
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
                .frame(width: 218, height: 218)
            Circle()
                .stroke(Color.white.opacity(0.09), lineWidth: 1)
                .frame(width: 178, height: 178)

            // Static tick marks
            Canvas { context, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let radius: CGFloat = 78
                let count = 48
                for i in 0..<count {
                    let angle = (Double(i) / Double(count)) * 2 * .pi - .pi / 2
                    let tickLen: CGFloat = i % 4 == 0 ? 14 : 8
                    let s = CGPoint(x: center.x + cos(angle) * (radius - tickLen / 2),
                                    y: center.y + sin(angle) * (radius - tickLen / 2))
                    let e = CGPoint(x: center.x + cos(angle) * (radius + tickLen / 2),
                                    y: center.y + sin(angle) * (radius + tickLen / 2))
                    var p = Path()
                    p.move(to: s)
                    p.addLine(to: e)
                    context.stroke(p, with: .color(Color(hex: "#DAFC79").opacity(0.35)), lineWidth: 1.5)
                }

                // Sweep line (animated)
                let sa = sweepAngle * 2 * .pi - .pi / 2
                var sweep = Path()
                sweep.move(to: center)
                sweep.addLine(to: CGPoint(x: center.x + cos(sa) * radius,
                                          y: center.y + sin(sa) * radius))
                context.stroke(sweep, with: .color(Color(red: 0.25, green: 0.65, blue: 1.0, opacity: 0.7)), lineWidth: 2)
            }
            .frame(width: 190, height: 190)

            // Dark center
            Circle()
                .fill(Color(white: 0.04))
                .frame(width: 110, height: 110)
                .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
        }
    }

    // MARK: - Large circular clip button

    private var largeCircularButton: some View {
        Button(action: handleButtonTap) {
            ZStack {
                // Outer faint rings
                Circle()
                    .stroke(Color.white.opacity(0.04), lineWidth: 1)
                    .frame(width: 286, height: 286)
                Circle()
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
                    .frame(width: 248, height: 248)
                Circle()
                    .stroke(Color.white.opacity(0.09), lineWidth: 1)
                    .frame(width: 210, height: 210)

                // Waveform tick marks + sweep line
                Canvas { context, size in
                    let center = CGPoint(x: size.width / 2, y: size.height / 2)
                    let radius: CGFloat = 96
                    let count = 72

                    for i in 0..<count {
                        let angle = (Double(i) / Double(count)) * 2 * .pi - .pi / 2
                        let level = Double(recorder.audioLevels[i % recorder.audioLevels.count])
                        let innerR = radius - 4
                        let outerR = recorder.isRecording
                            ? radius + level * 28
                            : radius + 8
                        let s = CGPoint(x: center.x + cos(angle) * innerR,
                                        y: center.y + sin(angle) * innerR)
                        let e = CGPoint(x: center.x + cos(angle) * outerR,
                                        y: center.y + sin(angle) * outerR)
                        var p = Path()
                        p.move(to: s)
                        p.addLine(to: e)
                        context.stroke(p, with: .color(Color(hex: "#DAFC79").opacity(0.72)), lineWidth: 1.5)
                    }

                    // Blue sweep line
                    let sa = sweepAngle * 2 * .pi - .pi / 2
                    var sweep = Path()
                    sweep.move(to: center)
                    sweep.addLine(to: CGPoint(x: center.x + cos(sa) * radius,
                                              y: center.y + sin(sa) * radius))
                    context.stroke(sweep, with: .color(Color(red: 0.25, green: 0.65, blue: 1.0)), lineWidth: 2.5)
                }
                .frame(width: 220, height: 220)

                // Lime green center circle
                Circle()
                    .fill(accentColor)
                    .frame(width: 118, height: 118)
                    .shadow(color: accentColor.opacity(recorder.isRecording ? 0.55 : 0.35), radius: 28)

                // Icon: ↺
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 44, weight: .medium))
                    .foregroundColor(.black)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Recording status badge

    private var recordingBadge: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(Color.red)
                .frame(width: 8, height: 8)
                .opacity(recorder.isRecording ? 1 : 0.5)
            Text(recorder.isRecording
                 ? "RECORDING · \(formatDuration(recorder.bufferSeconds))"
                 : "NOT RECORDING")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white.opacity(0.7))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 7)
        .background(Color.white.opacity(0.08))
        .clipShape(Capsule())
    }

    // MARK: - Actions

    private func handleButtonTap() {
        if recorder.isRecording {
            clipAudio()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        Task {
            do {
                try await recorder.startRecording()
                HapticsManager.shared.success()
            } catch {
                showError(error.localizedDescription)
            }
        }
    }

    private func clipAudio() {
        guard recorder.bufferSeconds > 0 else {
            showError("No audio recorded yet")
            return
        }
        HapticsManager.shared.success()
        recorder.stopRecording()
        if let url = recorder.getAudioURL() {
            onClipSaved(url, [])
        } else {
            showError("Failed to save clip")
        }
    }

    private func requestPermission() {
        Task {
            let granted = await recorder.requestPermission()
            if granted {
                startRecording()
            } else {
                showError("Microphone access is required to record")
            }
        }
    }

    private func showError(_ msg: String) {
        HapticsManager.shared.error()
        toastMessage = msg
        showToast = true
    }

    private func startSweep() {
        sweepTimer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { _ in
            Task { @MainActor in
                sweepAngle = fmod(sweepAngle + 0.02, 1.0)
            }
        }
    }

    private func formatDuration(_ seconds: Double) -> String {
        let m = Int(seconds) / 60
        let s = Int(seconds) % 60
        return String(format: "%d:%02d", m, s)
    }
}
