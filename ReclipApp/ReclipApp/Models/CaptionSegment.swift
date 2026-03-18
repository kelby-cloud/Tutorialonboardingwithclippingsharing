// CaptionSegment.swift
// ReclipApp
//
// A single timestamped transcription segment from SFSpeechRecognizer.

import Foundation

// MARK: - CaptionSegment

struct CaptionSegment: Identifiable, Sendable, Equatable {
    let id   = UUID()
    let time: Double
    let text: String

    // MARK: Preview data

    static let preview: [CaptionSegment] = [
        CaptionSegment(time: 0.0,  text: "Yo, did you hear what he just said?"),
        CaptionSegment(time: 3.2,  text: "Wait — say that again!"),
        CaptionSegment(time: 6.8,  text: "Bro clip that RIGHT NOW 😂"),
        CaptionSegment(time: 10.1, text: "That's actually insane lmao"),
        CaptionSegment(time: 13.5, text: "Reclip that before it's gone"),
    ]
}
