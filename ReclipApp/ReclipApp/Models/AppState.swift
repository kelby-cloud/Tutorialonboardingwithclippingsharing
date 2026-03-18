// AppState.swift
// ReclipApp
//
// Central navigation state and onboarding data model.

import SwiftUI

// MARK: - OnboardingData

/// Mutable bag that accumulates user input throughout the onboarding flow.
struct OnboardingData {
    var firstName      = ""
    var lastName       = ""
    /// Raw digits only, max 8 — formatted as MM/DD/YYYY in the UI.
    var birthdayDigits = ""
    /// Raw digits only, max 10 (US number without country code).
    var phone          = ""
    var countryCode    = "+1"
    var otp            = ""
    var username       = ""
}

// MARK: - AppScreen

/// Represents every top-level destination in the app.
enum AppScreen: Equatable {
    /// Animated tutorial / explainer carousel.
    case tutorial
    /// "Get Started" splash / phone-entry screen.
    case start
    /// Magic clip creation screen — receives optional recorded audio URL
    /// and any live caption segments captured during recording.
    case magic(audioURL: URL?, captions: [CaptionSegment])
    /// Viral share screen — shows the final clipped audio with captions.
    case viral(audioURL: URL?, captions: [CaptionSegment])
    /// Main onboarding flow (name, birthday, phone, OTP, username).
    case onboarding
    /// Friend discovery / contacts screen.
    case friends
    /// Onboarding complete / home placeholder.
    case done

    // MARK: Equatable

    static func == (lhs: AppScreen, rhs: AppScreen) -> Bool {
        switch (lhs, rhs) {
        case (.tutorial,   .tutorial):   return true
        case (.start,      .start):      return true
        case (.onboarding, .onboarding): return true
        case (.friends,    .friends):    return true
        case (.done,       .done):       return true
        case (.magic,      .magic):      return true
        case (.viral,      .viral):      return true
        default:                         return false
        }
    }
}

// MARK: - AppState

/// Single source of truth for global navigation and onboarding data.
@MainActor
class AppState: ObservableObject {

    // MARK: Navigation

    @Published var screen: AppScreen = .tutorial

    /// Alias for compatibility with ContentView and other consumers.
    var currentScreen: AppScreen {
        get { screen }
        set { screen = newValue }
    }

    // MARK: Toast

    @Published var toastMessage: String = ""
    @Published var isShowingToast: Bool = false

    func showToast(_ message: String) {
        toastMessage = message
        withAnimation { isShowingToast = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            withAnimation { self?.isShowingToast = false }
        }
    }

    // MARK: Onboarding

    @Published var onboardingData = OnboardingData()

    // MARK: Helpers

    /// Navigate to a new screen with a smooth ease-in-out transition.
    func navigate(to screen: AppScreen) {
        withAnimation(.easeInOut(duration: 0.3)) {
            self.screen = screen
        }
    }
}
