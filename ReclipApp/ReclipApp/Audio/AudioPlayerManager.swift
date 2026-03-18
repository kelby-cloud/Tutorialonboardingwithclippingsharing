// AudioPlayerManager.swift
// ReclipApp
//
// ObservableObject audio player with trim-point looping,
// live level metering, and static waveform decoding.

import AVFoundation
import Accelerate
import Combine

// MARK: - AudioPlayerManager

/// Loads an audio file, decodes a static waveform for display,
/// plays back between configurable trim points, and publishes
/// real-time level meters for an animated waveform bar view.
final class AudioPlayerManager: NSObject, ObservableObject {

    // MARK: Published State

    /// `true` while audio is playing.
    @Published var isPlaying: Bool = false

    /// Current playback position in seconds.
    @Published var currentTime: Double = 0

    /// Total duration of the loaded file in seconds.
    @Published var duration: Double = 0

    /// 80-element live level array (0 … 1), updated during playback.
    @Published var audioLevels: [Float] = [Float](repeating: 0, count: 80)

    /// 120-element normalised waveform decoded from the audio file (0 … 1).
    @Published var decodedWaveform: [Float] = [Float](repeating: 0, count: 120)

    // MARK: Trim Points

    /// Playback start trim point in seconds.
    var trimStart: Double = 0
    /// Playback end trim point in seconds (0 means use full duration).
    var trimEnd:   Double = 0

    // MARK: Private Properties

    private let engine     = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private var audioFile: AVAudioFile?
    private var displayLink: CADisplayLink?
    private var loopTimer:   Timer?

    private let liveLevelCount   = 80
    private let waveformBarCount = 120
    private var liveTapInstalled = false

    // MARK: Init / Deinit

    override init() {
        super.init()
        engine.attach(playerNode)
    }

    deinit {
        stopInternal()
        loopTimer?.invalidate()
    }

    // MARK: Public API – Loading

    /// Loads the audio file at `url`, extracts the static waveform
    /// asynchronously, and prepares the engine for playback.
    func loadAudio(url: URL) {
        stopInternal()
        loopTimer?.invalidate()

        do {
            let file = try AVAudioFile(forReading: url)
            self.audioFile = file

            let sr  = file.processingFormat.sampleRate
            let dur = Double(file.length) / sr

            DispatchQueue.main.async {
                self.duration    = dur
                self.currentTime = 0
                self.trimStart   = 0
                self.trimEnd     = dur
            }

            // Wire engine
            let format = file.processingFormat
            engine.connect(playerNode, to: engine.mainMixerNode, format: format)
            engine.mainMixerNode.outputVolume = 1.0

            do {
                try AVAudioSession.sharedInstance().setCategory(.playback,
                                                                 mode: .default)
                try AVAudioSession.sharedInstance().setActive(true)
                engine.prepare()
                try engine.start()
            } catch {
                print("[AudioPlayerManager] Engine start error: \(error)")
            }

            // Async waveform decode
            Task { await decodeWaveform(url: url) }

        } catch {
            print("[AudioPlayerManager] Load error: \(error)")
        }
    }

    // MARK: Public API – Playback

    /// Begins or resumes playback from the current `trimStart`.
    func play() {
        guard let file = audioFile, !isPlaying else { return }
        schedulePlayback(file: file, from: max(trimStart, 0))
        playerNode.play()
        DispatchQueue.main.async { self.isPlaying = true }
        startDisplayLink()
        scheduleLoopTimer()
    }

    /// Pauses playback without resetting position.
    func pause() {
        guard isPlaying else { return }
        playerNode.pause()
        stopDisplayLink()
        loopTimer?.invalidate()
        DispatchQueue.main.async { self.isPlaying = false }
    }

    /// Seeks to `time` (seconds), restarting playback from that position if playing.
    func seek(to time: Double) {
        let end        = trimEnd > 0 ? trimEnd : duration
        let clamped    = min(max(time, trimStart), end)
        let wasPlaying = isPlaying

        if wasPlaying {
            playerNode.stop()
            stopDisplayLink()
            loopTimer?.invalidate()
        }

        DispatchQueue.main.async { self.currentTime = clamped }

        if wasPlaying, let file = audioFile {
            schedulePlayback(file: file, from: clamped)
            playerNode.play()
            startDisplayLink()
            scheduleLoopTimer()
        }
    }

    // MARK: Public API – Waveform

    /// Decodes the audio file at `url` into 120 normalised amplitude bars.
    /// Updates `decodedWaveform` on the main actor when complete.
    func decodeWaveform(url: URL) async {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                guard let self else { continuation.resume(); return }

                do {
                    let file = try AVAudioFile(forReading: url)
                    let frameCount = Int(file.length)
                    guard frameCount > 0 else { continuation.resume(); return }

                    let format = file.processingFormat
                    guard let buffer = AVAudioPCMBuffer(
                        pcmFormat: format,
                        frameCapacity: AVAudioFrameCount(frameCount)
                    ) else { continuation.resume(); return }

                    file.framePosition = 0
                    try file.read(into: buffer)

                    guard let channelData = buffer.floatChannelData else {
                        continuation.resume(); return
                    }

                    let readFrames = Int(buffer.frameLength)
                    guard readFrames > 0 else { continuation.resume(); return }

                    let samples = Array(UnsafeBufferPointer(start: channelData[0],
                                                            count: readFrames))

                    let barCount      = self.waveformBarCount
                    let samplesPerBar = max(1, readFrames / barCount)
                    var bars          = [Float](repeating: 0, count: barCount)

                    for i in 0 ..< barCount {
                        let start = i * samplesPerBar
                        let end   = min(start + samplesPerBar, readFrames)
                        guard start < end else { continue }
                        var rms: Float = 0
                        vDSP_rmsqv(Array(samples[start ..< end]), 1, &rms,
                                   vDSP_Length(end - start))
                        bars[i] = rms
                    }

                    // Normalise to 0 … 1
                    var maxVal: Float = 0
                    vDSP_maxv(bars, 1, &maxVal, vDSP_Length(barCount))
                    if maxVal > 0 {
                        var divisor = maxVal
                        vDSP_vsdiv(bars, 1, &divisor, &bars, 1, vDSP_Length(barCount))
                    }

                    DispatchQueue.main.async { [weak self] in
                        self?.decodedWaveform = bars
                        continuation.resume()
                    }
                } catch {
                    print("[AudioPlayerManager] Waveform decode error: \(error)")
                    continuation.resume()
                }
            }
        }
    }

    // MARK: Private – Scheduling

    private func stopInternal() {
        playerNode.stop()
        if engine.isRunning { engine.stop() }
        removeLiveTap()
        stopDisplayLink()
        loopTimer?.invalidate()
        DispatchQueue.main.async { self.isPlaying = false }
    }

    private func schedulePlayback(file: AVAudioFile, from startTime: Double) {
        let sr         = file.processingFormat.sampleRate
        let startFrame = AVAudioFramePosition(startTime * sr)
        let endTime    = trimEnd > 0 ? trimEnd : duration
        let endFrame   = AVAudioFramePosition(endTime * sr)
        let count      = AVAudioFrameCount(max(0, endFrame - startFrame))
        guard count > 0 else { return }

        file.framePosition = startFrame
        playerNode.scheduleSegment(file,
                                   startingFrame: startFrame,
                                   frameCount: count,
                                   at: nil,
                                   completionCallbackType: .dataPlayedBack) { [weak self] _ in
            guard let self, self.isPlaying else { return }
            DispatchQueue.main.async { self.seek(to: self.trimStart) }
        }
    }

    // MARK: Private – Loop Timer

    private func scheduleLoopTimer() {
        loopTimer?.invalidate()
        let endTime   = trimEnd > 0 ? trimEnd : duration
        let remaining = endTime - currentTime
        guard remaining > 0 else { return }
        loopTimer = Timer.scheduledTimer(withTimeInterval: remaining,
                                          repeats: false) { [weak self] _ in
            guard let self, self.isPlaying else { return }
            self.seek(to: self.trimStart)
        }
    }

    // MARK: Private – Display Link

    private func startDisplayLink() {
        stopDisplayLink()
        let dl = CADisplayLink(target: self, selector: #selector(tick))
        dl.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60)
        dl.add(to: .main, forMode: .common)
        displayLink = dl
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func tick() {
        guard let nodeTime   = playerNode.lastRenderTime,
              let playerTime = playerNode.playerTime(forNodeTime: nodeTime)
        else { return }

        let sr      = audioFile?.processingFormat.sampleRate ?? 44_100
        let elapsed = Double(playerTime.sampleTime) / sr
        let current = trimStart + elapsed
        let end     = trimEnd > 0 ? trimEnd : duration

        DispatchQueue.main.async {
            self.currentTime = min(current, end)
        }

        updateLiveLevels()
    }

    // MARK: Private – Live Levels

    private func installLiveTapIfNeeded() {
        guard !liveTapInstalled, engine.isRunning else { return }
        let fmt = engine.mainMixerNode.outputFormat(forBus: 0)
        guard fmt.channelCount > 0, fmt.sampleRate > 0 else { return }

        engine.mainMixerNode.installTap(onBus: 0,
                                        bufferSize: 512,
                                        format: fmt) { [weak self] buffer, _ in
            self?.computeLiveLevels(from: buffer)
        }
        liveTapInstalled = true
    }

    private func removeLiveTap() {
        guard liveTapInstalled else { return }
        engine.mainMixerNode.removeTap(onBus: 0)
        liveTapInstalled = false
    }

    private func updateLiveLevels() {
        if !liveTapInstalled { installLiveTapIfNeeded() }
    }

    private func computeLiveLevels(from buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }
        let frameCount = Int(buffer.frameLength)
        guard frameCount > 0 else { return }

        let samples       = Array(UnsafeBufferPointer(start: channelData[0],
                                                       count: frameCount))
        let samplesPerBar = max(1, frameCount / liveLevelCount)
        var levels        = [Float](repeating: 0, count: liveLevelCount)

        for i in 0 ..< liveLevelCount {
            let start = i * samplesPerBar
            let end   = min(start + samplesPerBar, frameCount)
            guard start < end else { continue }
            var rms: Float = 0
            vDSP_rmsqv(Array(samples[start ..< end]), 1, &rms,
                       vDSP_Length(end - start))
            let db = 20 * log10(max(rms, 1e-9))
            levels[i] = max(0, min(1, (db + 60) / 60))
        }

        DispatchQueue.main.async { [weak self] in
            self?.audioLevels = levels
        }
    }
}
