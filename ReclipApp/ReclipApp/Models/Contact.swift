// Contact.swift
// ReclipApp
//
// Contact model and mock data for friend discovery screen.

import Foundation

// MARK: - Contact Model

struct Contact: Identifiable {

    // MARK: Stored Properties

    let id = UUID()
    let name:     String
    /// Reclip @handle — present when the contact is on Reclip.
    let handle:   String?
    /// Whether this contact already has a Reclip account.
    let onReclip: Bool
    /// Whether the user has selected this contact (for inviting / following).
    var isSelected: Bool = false

    // MARK: Computed

    /// Two-letter initials derived from name components.
    var initials: String {
        let parts = name.split(separator: " ")
        let f = parts.first?.first.map(String.init) ?? ""
        let l = parts.dropFirst().first?.first.map(String.init) ?? ""
        return (f + l).uppercased()
    }

    // MARK: Mock Data

    static let mockContacts: [Contact] = [
        Contact(name: "Ava Martinez",  handle: "@ava.m",  onReclip: true),
        Contact(name: "Jordan Lee",    handle: "@jlee",   onReclip: true),
        Contact(name: "Destiny Brown", handle: "@des.b",  onReclip: true),
        Contact(name: "Kai Nguyen",    handle: "@kai.n",  onReclip: true),
        Contact(name: "Sophie Chen",   handle: "@soph",   onReclip: true),
        Contact(name: "Marcus Taylor", handle: nil,       onReclip: false),
        Contact(name: "Ella Rivera",   handle: nil,       onReclip: false),
        Contact(name: "Noah Kim",      handle: nil,       onReclip: false),
    ]

    /// Avatar background hex color strings for mock contacts (index-matched).
    static let avatarColors: [String] = [
        "#4A90D9", "#7B4EA0", "#E07B3C", "#C0392B",
        "#27AE60", "#5D4037", "#1565C0", "#6A1B9A"
    ]
}
