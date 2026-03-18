// ReclipLogoView.swift
// ReclipApp
//
// Styled "RECLIP" wordmark with the R mirrored horizontally.

import SwiftUI

// MARK: - ReclipLogoView

/// The primary app wordmark.
///
/// The leading "R" is mirrored on its horizontal axis (`scaleEffect(x: -1)`)
/// to create the distinctive reversed-R mark, while the remaining letters
/// "ECLIP" are rendered normally.
struct ReclipLogoView: View {

    /// Point size of the logo text. Defaults to 26 pt.
    var size: CGFloat = 26

    /// Foreground colour of the logo. Defaults to white.
    var color: Color = .white

    var body: some View {
        HStack(spacing: 0) {
            // Mirrored R
            Text("R")
                .scaleEffect(x: -1, y: 1, anchor: .center)
            // Remaining letters
            Text("ECLIP")
        }
        .font(.system(size: size, weight: .black))
        .foregroundColor(color)
    }
}

// MARK: - Previews

#if DEBUG
struct ReclipLogoView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 24) {
            ReclipLogoView()

            ReclipLogoView(size: 40, color: Theme.Colors.brand)

            ReclipLogoView(size: 18, color: Theme.Colors.muted)
        }
        .padding()
        .background(Color.black)
        .previewLayout(.sizeThatFits)
    }
}
#endif
