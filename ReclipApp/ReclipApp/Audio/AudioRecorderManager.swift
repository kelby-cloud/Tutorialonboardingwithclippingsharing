import AVFoundation
import Foundation
import Combine

@MainActor
class AudioRecorderManager: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var bufferSeconds: Double = 0
    @Published var permissionGranted = false
    @Published var audioLevels: [Float] = Array(repeating: 0, count: 64)

    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var recordedData: [Float] = []
    private var sampleRate: Double = 44100
    private let maxBufferDuration: Double = 120 // 2 minutes

    override init() {
        super.init()
        Task { await checkPermission() }
    }

    private func checkPermission() async {
        let status = AVAudioApplication.shared.recordPermission
        permissionGranted = (status == .granted)
    }

    func requestPermission() async -> Bool {
        let granted = await AVAudioApplication.requestRecordPermission()
        permissionGranted = granted
        return granted
    }

    func startRecording() async throws {
        guard permissionGranted else { throw AudioError.permissionDenied }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else { return }

        inputNode = engine.inputNode
        guard let input = inputNode else { return }

        let format = input.outputFormat(forBus: 0)
        sampleRate = format.sampleRate
        recordedData = []
        bufferSeconds = 0

        input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            Task { @MainActor in self.processBuffer(buffer) }
        }

        try engine.start()
        isRecording = true
    }

    private func processBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameCount = Int(buffer.frameLength)

        recordedData.append(contentsOf: UnsafeBufferPointer(start: channelData, count: frameCount))

        // Trim to max buffer duration
        let maxSamples = Int(maxBufferDuration * sampleRate)
        if recordedData.count > maxSamples {
            recordedData.removeFirst(recordedData.count - maxSamples)
        }

        bufferSeconds = min(Double(recordedData.count) / sampleRate, maxBufferDuration)

        // Update visualization levels
        let rms = calculateRMS(channelData, frameCount: frameCount)
        let normalized = min(rms * 10, 1.0)
        var newLevels = audioLevels
        newLevels.removeFirst()
        newLevels.append(normalized)
        audioLevels = newLevels
    }

    private func calculateRMS(_ data: UnsafePointer<Float>, frameCount: Int) -> Float {
        var sum: Float = 0
        for i in 0..<frameCount { sum += data[i] * data[i] }
        return sqrt(sum / Float(max(frameCount, 1)))
    }

    func stopRecording() {
        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func getAudioURL() -> URL? {
        saveToWAV(data: recordedData)
    }

    func getTrimmedAudio(startTime: Double, endTime: Double) -> URL? {
        let startSample = Int(startTime * sampleRate)
        let endSample = min(Int(endTime * sampleRate), recordedData.count)
        guard startSample < endSample else { return nil }
        return saveToWAV(data: Array(recordedData[startSample..<endSample]))
    }

    private func saveToWAV(data: [Float]) -> URL? {
        guard !data.isEmpty else { return nil }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("reclip_\(Int(Date().timeIntervalSince1970)).wav")
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let audioFile = try? AVAudioFile(forWriting: url, settings: format.settings),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(data.count))
        else { return nil }

        buffer.frameLength = buffer.frameCapacity
        if let channelData = buffer.floatChannelData?[0] {
            data.withUnsafeBufferPointer { ptr in
                channelData.initialize(from: ptr.baseAddress!, count: ptr.count)
            }
        }
        try? audioFile.write(from: buffer)
        return url
    }

    /// Returns normalized waveform samples (0-1) for UI display
    func getWaveformSamples(count: Int) -> [Float] {
        guard !recordedData.isEmpty else { return Array(repeating: 0, count: count) }
        let step = recordedData.count / count
        guard step > 0 else { return Array(repeating: 0, count: count) }
        return (0..<count).map { i in
            let slice = recordedData[(i * step)..<min((i + 1) * step, recordedData.count)]
            let rms = sqrt(slice.map { $0 * $0 }.reduce(0, +) / Float(slice.count))
            return min(rms * 5, 1.0)
        }
    }
}

enum AudioError: LocalizedError {
    case permissionDenied
    case recordingFailed
    case playbackFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied: return "Microphone access was denied."
        case .recordingFailed: return "Recording failed."
        case .playbackFailed: return "Playback failed."
        }
    }
}
