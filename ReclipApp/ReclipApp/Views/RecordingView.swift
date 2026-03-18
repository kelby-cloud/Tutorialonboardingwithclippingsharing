import SwiftUI
import AVFoundation

struct RecordingView: View {
    @ObservedObject var recorder: AudioRecorderManager
    var onClipSaved: (URL, [CaptionSegment]) -> Void

    @State private var showPermissionModal = false
    @State private var errorMessage: String?
    @State private var showToast = false
    @State private var toastMessage = ""
    @State private var pulseTimer: Timer?

    private let accentColor = Color(hex: "#DAFC79")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Navigation bar
                HStack {
                    ReclipLogoView()
                    Spacer()
                    if recorder.isRecording {
                        recordingIndicator
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                Spacer()

                // Circular waveform
                CircularWaveformView(
                    levels: recorder.audioLevels,
                    isActive: recorder.isRecording,
                    size: 260
                )
                .overlay(
                    VStack(spacing: 4) {
                        if recorder.isRecording {
                            Text(formatDuration(recorder.bufferSeconds))
                                .font(.system(size: 32, weight: .black, design: .monospaced))
                                .foregroundColor(.white)
                            Text("buffered")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.5))
                        } else {
                            Text("Tap to record")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                )

                Spacer()

                // Instructions
                Text(recorder.isRecording
                     ? "Speak naturally — we're buffering the last 2 minutes"
                     : "Start recording to build your audio buffer")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 32)

                // Action buttons
                HStack(spacing: 32) {
                    if recorder.isRecording {
                        // Stop button
                        Button(action: stopRecording) {
                            ZStack {
                                Circle()
                                    .fill(Color.white.opacity(0.12))
                                    .frame(width: 60, height: 60)
                                Image(systemName: "stop.fill")
                                    .font(.system(size: 22))
                                    .foregroundColor(.white)
                            }
                        }
                    }

                    // Main clip/record button
                    ClipButtonView(
                        label: recorder.isRecording ? "Clip" : "Start",
                        isRecording: recorder.isRecording
                    ) {
                        if recorder.isRecording {
                            clipAudio()
                        } else {
                            startRecording()
                        }
                    }

                    if recorder.isRecording {
                        // Share button placeholder
                        Button(action: {}) {
                            ZStack {
                                Circle()
                                    .fill(Color.white.opacity(0.12))
                                    .frame(width: 60, height: 60)
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 20))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                        .disabled(true)
                    }
                }
                .padding(.bottom, 60)
            }

            // Toast overlay
            ToastOverlay(isShowing: $showToast, message: toastMessage)

            // Permission modal
            if showPermissionModal {
                MicPermissionModal(
                    onAllow: requestPermission,
                    onDismiss: { showPermissionModal = false }
                )
                .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: recorder.isRecording)
        .animation(.easeInOut, value: showPermissionModal)
    }

    // MARK: - Actions

    private func startRecording() {
        if recorder.permissionGranted {
            Task {
                do {
                    try await recorder.startRecording()
                    HapticsManager.shared.success()
                } catch {
                    showError(error.localizedDescription)
                }
            }
        } else {
            showPermissionModal = true
        }
    }

    private func stopRecording() {
        recorder.stopRecording()
        HapticsManager.shared.medium()
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
            showPermissionModal = false
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

    // MARK: - Helpers

    private func formatDuration(_ seconds: Double) -> String {
        let m = Int(seconds) / 60
        let s = Int(seconds) % 60
        return String(format: "%d:%02d", m, s)
    }

    private var recordingIndicator: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(Color.red)
                .frame(width: 8, height: 8)
                .opacity(0.9)
            Text("REC")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.red)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.red.opacity(0.1))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.red.opacity(0.3), lineWidth: 1))
    }
}
