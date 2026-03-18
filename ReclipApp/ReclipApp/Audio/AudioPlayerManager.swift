import AVFoundation
import Foundation

@MainActor
class AudioPlayerManager: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var audioLevels: [Float] = Array(repeating: 0, count: 64)

    private var player: AVAudioPlayer?
    private var progressTimer: Timer?

    func load(url: URL) throws {
        stop()
        player = try AVAudioPlayer(contentsOf: url)
        player?.delegate = self
        player?.prepareToPlay()
        player?.isMeteringEnabled = true
        duration = player?.duration ?? 0
        currentTime = 0
    }

    func play() {
        guard let player else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {}
        player.play()
        isPlaying = true
        startProgressTimer()
    }

    func pause() {
        player?.pause()
        isPlaying = false
        progressTimer?.invalidate()
        progressTimer = nil
    }

    func stop() {
        player?.stop()
        player?.currentTime = 0
        isPlaying = false
        currentTime = 0
        progressTimer?.invalidate()
        progressTimer = nil
    }

    func seek(to time: Double) {
        player?.currentTime = time
        currentTime = time
    }

    func togglePlayPause() {
        isPlaying ? pause() : play()
    }

    private func startProgressTimer() {
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let player = self.player else { return }
                self.currentTime = player.currentTime
                player.updateMeters()
                let level = player.averagePower(forChannel: 0)
                let normalized = Float(max(0, (level + 80) / 80))
                var levels = self.audioLevels
                levels.removeFirst()
                levels.append(normalized)
                self.audioLevels = levels
            }
        }
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.isPlaying = false
            self.currentTime = 0
            self.progressTimer?.invalidate()
            self.progressTimer = nil
        }
    }
}
