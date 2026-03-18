import SwiftUI
import AVFoundation

struct MagicMomentView: View {
    var audioURL: URL?
    @ObservedObject var recorder: AudioRecorderManager
    var onShare: (URL?) -> Void

    @StateObject private var player = AudioPlayerManager()
    @State private var waveformSamples: [Float] = Array(repeating: 0.3, count: 120)
    @State private var startProgress: CGFloat = 0.0
    @State private var endProgress: CGFloat = 1.0
    @State private var isLoadingAudio = false
    @State private var showToast = false
    @State private var toastMessage = ""

    private let accentColor = Color(hex: "#DAFC79")

    var selectedDuration: Double {
        player.duration * Double(endProgress - startProgress)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Your Moment")
                            .font(.system(size: 28, weight: .black))
                            .foregroundColor(.white)
                        Text("Trim your clip")
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    Spacer()
                    durationBadge
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)

                Spacer()

                // Waveform playback visualization
                if player.isPlaying {
                    LinearWaveformView(
                        samples: waveformSamples,
                        progress: player.duration > 0 ? CGFloat(player.currentTime / player.duration) : 0,
                        height: 60
                    )
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)
                }

                // Waveform trimmer
                VStack(spacing: 12) {
                    WaveformTrimmerView(
                        samples: waveformSamples,
                        startProgress: $startProgress,
                        endProgress: $endProgress,
                        duration: player.duration,
                        height: 90
                    )
                    .padding(.horizontal, 24)
                    .onChange(of: startProgress) { _ in onTrimChanged() }
                    .onChange(of: endProgress) { _ in onTrimChanged() }

                    // Time labels
                    HStack {
                        Text(formatTime(player.duration * Double(startProgress)))
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(accentColor)
                        Spacer()
                        Text(formatTime(player.duration * Double(endProgress)))
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(accentColor)
                    }
                    .padding(.horizontal, 24)
                }

                Spacer()

                // Play / Pause control
                HStack(spacing: 24) {
                    Spacer()
                    Button(action: togglePlayback) {
                        ZStack {
                            Circle()
                                .fill(Color.white.opacity(0.1))
                                .frame(width: 64, height: 64)
                                .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 1))
                            Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                        }
                    }

                    Text(formatTime(player.currentTime))
                        .font(.system(size: 16, weight: .medium, design: .monospaced))
                        .foregroundColor(.white.opacity(0.6))
                        .frame(width: 60, alignment: .leading)
                    Spacer()
                }
                .padding(.bottom, 32)

                // Share CTA
                VStack(spacing: 12) {
                    PrimaryButton(label: "Share This Clip", systemImage: "square.and.arrow.up") {
                        shareTrimmedClip()
                    }
                    .padding(.horizontal, 24)

                    Button("Re-record") {
                        HapticsManager.shared.light()
                        player.stop()
                        onShare(nil)
                    }
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.5))
                }
                .padding(.bottom, 40)
            }

            ToastOverlay(isShowing: $showToast, message: toastMessage)
        }
        .onAppear { loadAudio() }
        .onDisappear { player.stop() }
    }

    // MARK: - Actions

    private func loadAudio() {
        isLoadingAudio = true
        guard let url = audioURL else { return }
        do {
            try player.load(url: url)
            waveformSamples = recorder.getWaveformSamples(count: 120)
            isLoadingAudio = false
        } catch {
            isLoadingAudio = false
            toastMessage = "Failed to load audio"
            showToast = true
        }
    }

    private func togglePlayback() {
        if player.isPlaying {
            player.pause()
        } else {
            player.seek(to: player.duration * Double(startProgress))
            player.play()
        }
        HapticsManager.shared.light()
    }

    private func onTrimChanged() {
        if player.isPlaying {
            let trimStart = player.duration * Double(startProgress)
            if player.currentTime < trimStart {
                player.seek(to: trimStart)
            }
        }
    }

    private func shareTrimmedClip() {
        HapticsManager.shared.success()
        player.stop()
        let startTime = player.duration * Double(startProgress)
        let endTime = player.duration * Double(endProgress)
        let trimmedURL = recorder.getTrimmedAudio(startTime: startTime, endTime: endTime)
        onShare(trimmedURL)
    }

    // MARK: - Helpers

    private func formatTime(_ seconds: Double) -> String {
        let s = max(0, seconds)
        return String(format: "%d:%05.2f", Int(s) / 60, s.truncatingRemainder(dividingBy: 60))
    }

    private var durationBadge: some View {
        Text(String(format: "%.1fs", selectedDuration))
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(accentColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(accentColor.opacity(0.15))
            .clipShape(Capsule())
    }
}
