// ContentView.swift
// ReclipApp
//
// Root navigation coordinator — switches between top-level screens
// based on AppState.currentScreen with a cross-fade / slide transition.

import SwiftUI

// MARK: - ContentView

struct ContentView: View {

    // MARK: Environment

    @EnvironmentObject private var appState: AppState

    // MARK: Body

    var body: some View {
        ZStack {
            // Background — always black so transitions don't flash
            Theme.Colors.background
                .ignoresSafeArea()

            // Screen switcher
            screenView(for: appState.currentScreen)
                .id(appState.currentScreen)   // force view identity reset on screen change
                .transition(
                    .asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal:   .move(edge: .leading).combined(with: .opacity)
                    )
                )
        }
        .animation(.easeInOut(duration: 0.30), value: appState.currentScreen)
        // Toast overlay on top of everything
        .overlay(alignment: .top) {
            if appState.isShowingToast {
                ToastView(
                    isShowing: $appState.isShowingToast,
                    message:   appState.toastMessage
                )
            }
        }
    }

    // MARK: Screen Router

    @ViewBuilder
    private func screenView(for screen: AppScreen) -> some View {
        switch screen {
        case .tutorial:
            TutorialView {
                appState.navigate(to: .start)
            }

        case .start:
            InstantStartView(onClipSaved: { audioURL, captions in
                appState.navigate(to: .magic(audioURL: audioURL, captions: captions))
            })

        case let .magic(audioURL, captions):
            MagicMomentView(
                audioURL: audioURL,
                captions: captions,
                onShare: { url, caps in
                    appState.navigate(to: .viral(audioURL: url, captions: caps))
                },
                onBack: {
                    appState.navigate(to: .start)
                }
            )

        case let .viral(audioURL, captions):
            ViralTriggerView(
                audioURL: audioURL,
                captions: captions,
                onJoin: {
                    appState.navigate(to: .onboarding)
                }
            )

        case .onboarding:
            OnboardingView {
                appState.navigate(to: .friends)
            }

        case .friends:
            FriendLoopView {
                appState.navigate(to: .done)
            }

        case .done:
            DoneView {
                appState.navigate(to: .tutorial)
            }
        }
    }
}

// MARK: - Previews

#if DEBUG
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppState())
            .environmentObject(AudioEngine.shared)
    }
}
#endif
