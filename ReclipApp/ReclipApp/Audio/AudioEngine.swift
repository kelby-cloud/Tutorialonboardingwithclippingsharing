// AudioEngine.swift
// ReclipApp
//
// Singleton AVAudioEngine-based audio monitoring system.
// Installs a tap on the input node, performs FFT via Accelerate vDSP,
// and publishes a 64-band normalised spectrum at ~30 fps.

import AVFoundation
import Accelerate
import Combine

// MARK: - AudioEngine

/// Singleton that monitors microphone input and publishes real-time
/// frequency-band magnitudes for waveform visualisation.
final class AudioEngine: NSObject, ObservableObject {

    // MARK: Singleton

    static let shared = AudioEngine()

    // MARK: Published State

    /// 64-element FFT magnitude array; each value normalised to 0 … 1.
    @Published var audioLevels: [Float] = [Float](repeating: 0, count: 64)

    /// Scalar average of all 64 bins, 0 … 1.
    @Published var averageLevel: Float = 0

    /// Whether the user has granted microphone permission.
    @Published var permissionGranted: Bool = false

    // MARK: Private Properties

    private let engine   = AVAudioEngine()
    private let binCount = 64

    /// Buffer size fed to the tap; must be a power-of-2 for vDSP.
    private let bufferSize: AVAudioFrameCount = 1024

    /// FFT uses the same power-of-2 as `bufferSize`.
    private let fftSize = 1024
    private var fftSetup: FFTSetup?
    private var log2n:    vDSP_Length = 0

    /// Guards against duplicate tap installations.
    private var isMonitoring = false

    /// Throttle display to approximately 30 fps.
    private var lastUpdateTime: CFAbsoluteTime = 0
    private let updateInterval: CFAbsoluteTime = 1.0 / 30.0

    // MARK: Init / Deinit

    private override init() {
        super.init()
        let n = vDSP_Length(log2(Double(fftSize)))
        self.log2n  = n
        self.fftSetup = vDSP_create_fftsetup(n, FFTRadix(kFFTRadix2))
    }

    deinit {
        if let setup = fftSetup { vDSP_destroy_fftsetup(setup) }
    }

    // MARK: Permission

    /// Requests microphone permission.  Updates `permissionGranted` and returns the result.
    @discardableResult
    func requestPermission() async -> Bool {
        let granted = await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        await MainActor.run { self.permissionGranted = granted }
        return granted
    }

    // MARK: Monitoring

    /// Configures the audio session, installs the input tap, and begins
    /// publishing level updates at approximately 30 fps.
    func startMonitoring() throws {
        guard !isMonitoring else { return }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord,
                                mode: .measurement,
                                options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        let inputNode = engine.inputNode
        let format    = inputNode.outputFormat(forBus: 0)

        guard format.channelCount > 0, format.sampleRate > 0 else {
            throw AudioEngineError.invalidInputFormat
        }

        inputNode.installTap(onBus: 0,
                             bufferSize: bufferSize,
                             format: format) { [weak self] buffer, _ in
            self?.processBuffer(buffer)
        }

        engine.prepare()
        try engine.start()
        isMonitoring = true
    }

    /// Removes the input tap, stops the engine, and zeroes the published levels.
    func stopMonitoring() {
        guard isMonitoring else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isMonitoring = false
        try? AVAudioSession.sharedInstance().setActive(false,
             options: .notifyOthersOnDeactivation)
        DispatchQueue.main.async {
            self.audioLevels  = [Float](repeating: 0, count: self.binCount)
            self.averageLevel = 0
        }
    }

    // MARK: DSP

    private func processBuffer(_ buffer: AVAudioPCMBuffer) {
        // Throttle to ~30 fps
        let now = CFAbsoluteTimeGetCurrent()
        guard now - lastUpdateTime >= updateInterval else { return }
        lastUpdateTime = now

        guard
            let setup = fftSetup,
            let channelData = buffer.floatChannelData
        else { return }

        let frameCount = Int(buffer.frameLength)
        guard frameCount > 0 else { return }

        // Copy from first channel and pad / trim to fftSize
        var samples = [Float](UnsafeBufferPointer(start: channelData[0],
                                                  count: min(frameCount, fftSize)))
        if samples.count < fftSize {
            samples += [Float](repeating: 0, count: fftSize - samples.count)
        }

        // Hann window
        var window = [Float](repeating: 0, count: fftSize)
        vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_NORM))
        vDSP_vmul(samples, 1, window, 1, &samples, 1, vDSP_Length(fftSize))

        // Pack into split-complex format
        let halfSize = fftSize / 2
        var realPart = [Float](repeating: 0, count: halfSize)
        var imagPart = [Float](repeating: 0, count: halfSize)
        var splitComplex = DSPSplitComplex(realp: &realPart, imagp: &imagPart)

        samples.withUnsafeBufferPointer { ptr in
            ptr.baseAddress!.withMemoryRebound(to: DSPComplex.self,
                                               capacity: halfSize) { complexPtr in
                vDSP_ctoz(complexPtr, 2, &splitComplex, 1, vDSP_Length(halfSize))
            }
        }

        // Forward FFT
        vDSP_fft_zrip(setup, &splitComplex, 1, log2n, FFTDirection(FFT_FORWARD))

        // Squared magnitudes
        var magnitudes = [Float](repeating: 0, count: halfSize)
        vDSP_zvmags(&splitComplex, 1, &magnitudes, 1, vDSP_Length(halfSize))

        // Scale
        var scaleFactor: Float = 1.0 / Float(fftSize)
        vDSP_vsmul(magnitudes, 1, &scaleFactor, &magnitudes, 1, vDSP_Length(halfSize))

        // Convert to dB
        var dbMagnitudes = [Float](repeating: 0, count: halfSize)
        var one: Float = 1.0
        vDSP_vdbcon(magnitudes, 1, &one, &dbMagnitudes, 1, vDSP_Length(halfSize), 0)

        // Bucket into binCount bands
        let binsPerBand = halfSize / binCount
        var bands = [Float](repeating: 0, count: binCount)
        for i in 0 ..< binCount {
            let start = i * binsPerBand
            var mean: Float = 0
            vDSP_meanv(Array(dbMagnitudes[start ..< start + binsPerBand]),
                       1, &mean, vDSP_Length(binsPerBand))
            bands[i] = mean
        }

        // Normalise from [-80 dB … 0 dB] to [0 … 1]
        let minDB: Float = -80, maxDB: Float = 0, range = maxDB - minDB
        let normalised = bands.map { max(0, min(1, ($0 - minDB) / range)) }

        var avg: Float = 0
        vDSP_meanv(normalised, 1, &avg, vDSP_Length(binCount))

        DispatchQueue.main.async { [weak self] in
            self?.audioLevels  = normalised
            self?.averageLevel = avg
        }
    }
}

// MARK: - Errors

enum AudioEngineError: LocalizedError {
    case invalidInputFormat

    var errorDescription: String? {
        switch self {
        case .invalidInputFormat:
            return "Microphone input format is invalid. Check simulator microphone settings."
        }
    }
}
