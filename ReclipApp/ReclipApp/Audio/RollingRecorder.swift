// RollingRecorder.swift
// ReclipApp
//
// 2-minute rolling audio buffer using AVAudioRecorder.
// Records to a single .m4a temp file; recording stops after the buffer
// is full (120 s) and can be retrieved via getRecordedURL().

import AVFoundation
import Combine

// MARK: - RollingRecorder

/// Records microphone audio into a temporary .m4a file, capping the
/// recording at 120 seconds (the oldest audio is discarded when the
/// limit is reached by simply restarting recording into a fresh file).
///
/// Designed for the "reclip" use-case where the user wants to capture
/// the *last* up-to-120 seconds of whatever was said.
final class RollingRecorder: ObservableObject {

    // MARK: Published State

    @Published var isRecording: Bool = false
    /// Seconds of audio currently buffered, capped at 120.
    @Published var bufferDuration: TimeInterval = 0

    // MARK: Constants

    private let maxBufferDuration: TimeInterval = 120.0

    // MARK: Private State

    private var recorder:      AVAudioRecorder?
    private var currentFileURL: URL?
    private var timer:         Timer?
    private var startDate:     Date?

    // MARK: Public API

    /// Configures the audio session and starts recording into a temp .m4a file.
    /// Throws if the audio session cannot be configured or the recorder fails to start.
    func startRecording() throws {
        guard !isRecording else { return }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord,
                                mode: .default,
                                options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        let url = newTempURL()
        currentFileURL = url

        let settings: [String: Any] = [
            AVFormatIDKey:            Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey:          44_100,
            AVNumberOfChannelsKey:    1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        let rec = try AVAudioRecorder(url: url, settings: settings)
        rec.isMeteringEnabled = false
        rec.record(forDuration: maxBufferDuration)
        recorder = rec

        startDate = Date()
        isRecording = true
        bufferDuration = 0

        // Update bufferDuration every second
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    /// Stops recording and frees the timer. The recorded file is retained
    /// and accessible via `getRecordedURL()` until the next `startRecording()` call.
    func stopRecording() {
        guard isRecording else { return }
        timer?.invalidate()
        timer = nil
        recorder?.stop()
        isRecording = false
        // Don't zero bufferDuration so callers can still read it before retrieving the file.
        try? AVAudioSession.sharedInstance().setActive(false,
             options: .notifyOthersOnDeactivation)
    }

    /// Returns the URL of the recorded temp .m4a file (up to 120 s of audio),
    /// or `nil` if no recording has been made yet.
    ///
    /// The caller is responsible for copying or processing the file before
    /// the next `startRecording()` overwrites it.
    func getRecordedURL() -> URL? {
        guard let url = currentFileURL,
              FileManager.default.fileExists(atPath: url.path)
        else { return nil }
        return url
    }

    // MARK: Private

    private func tick() {
        guard let start = startDate else { return }
        let elapsed = Date().timeIntervalSince(start)
        bufferDuration = min(elapsed, maxBufferDuration)

        // If we've hit the maximum, stop automatically so the recorder
        // doesn't continue writing silence beyond the limit.
        if elapsed >= maxBufferDuration {
            stopRecording()
        }
    }

    private func newTempURL() -> URL {
        FileManager.default.temporaryDirectory
            .appendingPathComponent("reclip_recording_\(UUID().uuidString).m4a")
    }
}
