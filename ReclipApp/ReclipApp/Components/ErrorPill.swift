// ErrorPill.swift
// ReclipApp
//
// Inline error message displayed as a capsule-shaped pill.

import SwiftUI

// MARK: - ErrorPill

/// A compact error indicator rendered as a capsule pill.
///
/// - Red alert-circle icon (13 pt) on the left.
/// - Message text in `Theme.Colors.destructive`.
/// - Semi-transparent red background (12 % alpha) with a 25 % alpha red border.
/// - Entrance animation uses `Theme.Springs.cardEntrance` with a slight scale-in.
struct ErrorPill: View {

    // MARK: Parameters

    let message: String

    // MARK: Private State

    @State private var appeared = false

    // MARK: Body

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.Colors.destructive)

            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Theme.Colors.destructive)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(Theme.Colors.destructive.opacity(0.12))
        )
        .overlay(
            Capsule()
                .strokeBorder(Theme.Colors.destructive.opacity(0.25), lineWidth: 1)
        )
        .scaleEffect(appeared ? 1.0 : 0.85)
        .opacity(appeared ? 1.0 : 0.0)
        .onAppear {
            withAnimation(Theme.Springs.general) {
                appeared = true
            }
        }
    }
}

// MARK: - Previews

#if DEBUG
struct ErrorPill_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            ErrorPill(message: "Phone number is invalid")
            ErrorPill(message: "Username already taken")
            ErrorPill(message: "OTP has expired. Please request a new one.")
        }
        .padding(24)
        .background(Color.black)
        .previewLayout(.sizeThatFits)
    }
}
#endif
