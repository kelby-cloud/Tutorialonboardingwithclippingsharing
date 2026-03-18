import Foundation

enum AppScreen: CaseIterable {
    case tutorial
    case recording
    case magicMoment
    case viralTrigger
    case onboarding
    case friendLoop
    case done
}

struct CaptionSegment: Identifiable {
    let id = UUID()
    var text: String
    var startTime: Double
    var endTime: Double
}
