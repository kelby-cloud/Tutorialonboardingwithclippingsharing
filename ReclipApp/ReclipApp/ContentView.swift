import SwiftUI

struct ContentView: View {
    @StateObject private var recorder = AudioRecorderManager()
    @State private var currentScreen: AppScreen = .tutorial
    @State private var audioURL: URL?
    @State private var captions: [CaptionSegment] = []

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            screenView
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .id(currentScreen)
        }
        .animation(.easeInOut(duration: 0.35), value: currentScreen)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var screenView: some View {
        switch currentScreen {
        case .tutorial:
            TutorialView {
                navigate(to: .recording)
            }

        case .recording:
            RecordingView(recorder: recorder) { url, captionData in
                self.audioURL = url
                self.captions = captionData
                navigate(to: .magicMoment)
            }

        case .magicMoment:
            MagicMomentView(audioURL: audioURL, recorder: recorder) { trimmedURL in
                if let url = trimmedURL {
                    self.audioURL = url
                    navigate(to: .viralTrigger)
                } else {
                    // Re-record
                    navigate(to: .recording)
                }
            }

        case .viralTrigger:
            ViralTriggerView(audioURL: audioURL) {
                navigate(to: .onboarding)
            }

        case .onboarding:
            OnboardingView {
                navigate(to: .friendLoop)
            }

        case .friendLoop:
            FriendLoopView {
                navigate(to: .done)
            }

        case .done:
            DoneView {
                audioURL = nil
                captions = []
                navigate(to: .tutorial)
            }
        }
    }

    private func navigate(to screen: AppScreen) {
        withAnimation(.easeInOut(duration: 0.35)) {
            currentScreen = screen
        }
    }
}
