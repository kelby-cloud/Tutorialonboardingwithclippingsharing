// Theme.swift
// ReclipApp Design System
// Colors, typography, and spring animations.

import SwiftUI

// MARK: - Color Hex Initializer

extension Color {
    /// Initialise a Color from a hex string.
    /// Accepts 3-digit RGB, 6-digit RGB ("DAFC79") or 8-digit ARGB ("FFDAFC79").
    init(hex: String) {
        let sanitised = hex.trimmingCharacters(in: .whitespacesAndNewlines)
                           .replacingOccurrences(of: "#", with: "")
        var raw: UInt64 = 0
        Scanner(string: sanitised).scanHexInt64(&raw)

        let r, g, b, a: Double
        switch sanitised.count {
        case 3:
            r = Double((raw & 0xF00) >> 8) * 17 / 255
            g = Double((raw & 0x0F0) >> 4) * 17 / 255
            b = Double( raw & 0x00F       ) * 17 / 255
            a = 1.0
        case 6:
            r = Double((raw & 0xFF0000) >> 16) / 255
            g = Double((raw & 0x00FF00) >>  8) / 255
            b = Double( raw & 0x0000FF        ) / 255
            a = 1.0
        case 8:
            r = Double((raw & 0xFF000000) >> 24) / 255
            g = Double((raw & 0x00FF0000) >> 16) / 255
            b = Double((raw & 0x0000FF00) >>  8) / 255
            a = Double( raw & 0x000000FF        ) / 255
        default:
            r = 1; g = 1; b = 1; a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - Theme Namespace

enum Theme {

    // MARK: Colors

    enum Colors {
        /// Lime green — primary brand color #DAFC79
        static let brand        = Color(hex: "DAFC79")
        /// Cyan — secondary accent #00C8FF
        static let accent       = Color(hex: "00C8FF")
        /// Pure black background
        static let background   = Color.black
        /// Pure white foreground
        static let foreground   = Color.white
        /// Muted gray — rgb(155, 155, 155)
        static let muted        = Color(red: 155 / 255, green: 155 / 255, blue: 155 / 255)
        /// Destructive red #FC3158
        static let destructive  = Color(hex: "FC3158")
        /// Popover background — rgba(51, 51, 51, 0.8)
        static let popoverBg    = Color(red: 51 / 255, green: 51 / 255, blue: 51 / 255).opacity(0.8)
        /// Surface — rgba(255, 255, 255, 0.06)
        static let surface      = Color.white.opacity(0.06)
    }

    // MARK: Fonts

    enum Fonts {
        /// Returns a Druk Wide Cy Black font at the given size,
        /// falling back to .system black weight if the font is not bundled.
        static func druk(_ size: CGFloat) -> Font {
            let fontName = "DrukWideCy-Black"
            if UIFont(name: fontName, size: size) != nil {
                return .custom(fontName, size: size)
            }
            return .system(size: size, weight: .black, design: .default)
        }

        /// Body text — 16pt regular system
        static let body    = Font.system(size: 16, weight: .regular)
        /// Label text — 14pt regular system
        static let label   = Font.system(size: 14, weight: .regular)
        /// Caption text — 13pt regular system
        static let caption = Font.system(size: 13, weight: .regular)

        /// Entry / hero number — 50pt black display
        static var entry: Font { druk(50) }
        /// H1 — 64pt black display
        static var h1:    Font { druk(64) }
        /// H2 — 56pt black display
        static var h2:    Font { druk(56) }
        /// H3 — 48pt black display
        static var h3:    Font { druk(48) }
        /// H4 — 36pt black display
        static var h4:    Font { druk(36) }
    }

    // MARK: Typography (spec-name alias for Fonts)

    enum Typography {
        static func druk(_ size: CGFloat) -> Font { Fonts.druk(size) }

        static let body    = Fonts.body
        static let label   = Fonts.label
        static let caption = Fonts.caption

        static var entry: Font { Fonts.entry }
        static var h1:    Font { Fonts.h1 }
        static var h2:    Font { Fonts.h2 }
        static var h3:    Font { Fonts.h3 }
        static var h4:    Font { Fonts.h4 }
    }

    // MARK: Springs

    enum Springs {
        /// Quick tactile feedback for button presses — response 0.25, damping 0.6
        static let buttonPress   = Animation.spring(response: 0.25, dampingFraction: 0.6)
        /// Card entrance — response 0.5, damping 0.7
        static let cardEntrance  = Animation.spring(response: 0.5,  dampingFraction: 0.7)
        /// Modal sheet entrance — response 0.3, damping 0.75
        static let modalEntrance = Animation.spring(response: 0.3,  dampingFraction: 0.75)
        /// General purpose spring — response 0.6, damping 0.7
        static let general       = Animation.spring(response: 0.6,  dampingFraction: 0.7)
    }

    // MARK: Animations (spec-name alias for Springs)

    enum Animations {
        static let buttonPress   = Springs.buttonPress
        static let cardEntrance  = Springs.cardEntrance
        static let modalEntrance = Springs.modalEntrance
        static let general       = Springs.general
    }

    // MARK: Radius

    enum Radius {
        static let pill:   CGFloat = 100
        static let card:   CGFloat = 20
        static let medium: CGFloat = 14
        static let small:  CGFloat = 10
    }

    // MARK: Spacing

    enum Spacing {
        static let xs:  CGFloat = 4
        static let sm:  CGFloat = 8
        static let md:  CGFloat = 16
        static let lg:  CGFloat = 24
        static let xl:  CGFloat = 32
        static let xxl: CGFloat = 48
    }
}

// MARK: - Convenience Font Extension

extension Font {
    /// Druk-style black display font at a custom point size.
    static func druk(_ size: CGFloat) -> Font {
        Theme.Fonts.druk(size)
    }
}

// MARK: - Convenience View Modifier

extension View {
    /// Fills the view with the app's pure-black background.
    func reclipBackground() -> some View {
        self.background(Theme.Colors.background.ignoresSafeArea())
    }
}
