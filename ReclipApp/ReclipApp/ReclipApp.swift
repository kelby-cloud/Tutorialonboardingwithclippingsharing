// ReclipApp.swift
// ReclipApp
//
// Application entry point.

import SwiftUI

@main
struct ReclipApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(AudioEngine.shared)
                .preferredColorScheme(.dark)
        }
    }
}
