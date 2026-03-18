// FriendLoopView.swift
// ReclipApp
//
// Contact picker — user selects up to 3 best friends to follow on Reclip.

import SwiftUI
import Contacts

// MARK: - FriendLoopView

struct FriendLoopView: View {

    // MARK: Parameters

    var onComplete: () -> Void

    // MARK: Environment

    @EnvironmentObject private var appState: AppState

    // MARK: State

    @State private var contacts: [Contact]        = Contact.mockContacts
    @State private var searchText: String         = ""
    @State private var permissionGranted: Bool    = false
    @State private var permissionDenied: Bool     = false
    @State private var showPermissionPrompt: Bool = false
    @State private var appeared: Bool             = false

    // MARK: Constants

    private let maxFriends = 3

    // MARK: Computed

    private var selectedCount: Int { contacts.filter(\.isSelected).count }

    private var onReclipFiltered: [Contact] {
        let base = contacts.filter(\.onReclip)
        guard !searchText.isEmpty else { return base }
        let q = searchText.lowercased()
        return base.filter { $0.name.lowercased().contains(q) || ($0.handle?.lowercased().contains(q) ?? false) }
    }

    private var inviteFiltered: [Contact] {
        let base = contacts.filter { !$0.onReclip }
        guard !searchText.isEmpty else { return base }
        let q = searchText.lowercased()
        return base.filter { $0.name.lowercased().contains(q) || ($0.handle?.lowercased().contains(q) ?? false) }
    }

    // MARK: Body

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Logo
                ReclipLogoView()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 20)
                    .padding(.bottom, 24)

                // Heading
                VStack(spacing: 6) {
                    Text("FIND YOUR PEOPLE.")
                        .font(Theme.Fonts.druk(36))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)

                    Text("Add up to \(maxFriends) best friends")
                        .font(Theme.Fonts.caption)
                        .foregroundColor(Theme.Colors.muted)
                        .kerning(2)
                        .textCase(.uppercase)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)

                // Search field
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Theme.Colors.muted)
                        .font(.system(size: 16))

                    TextField("", text: $searchText)
                        .placeholder(when: searchText.isEmpty) {
                            Text("Search contacts…")
                                .foregroundColor(Theme.Colors.muted)
                                .font(Theme.Fonts.body)
                        }
                        .font(Theme.Fonts.body)
                        .foregroundColor(.white)
                        .autocorrectionDisabled()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Theme.Colors.surface)
                .cornerRadius(12)
                .padding(.horizontal, 24)
                .padding(.bottom, 16)

                // Contact list
                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 0, pinnedViews: .sectionHeaders) {
                        // On Reclip section
                        if !onReclipFiltered.isEmpty {
                            Section {
                                ForEach(onReclipFiltered) { contact in
                                    contactRow(contact)
                                }
                            } header: {
                                sectionHeader("ON RECLIP")
                            }
                        }

                        // Invite section
                        if !inviteFiltered.isEmpty {
                            Section {
                                ForEach(inviteFiltered) { contact in
                                    contactRow(contact)
                                }
                            } header: {
                                sectionHeader("INVITE")
                            }
                        }

                        // Empty state
                        if onReclipFiltered.isEmpty && inviteFiltered.isEmpty {
                            Text("No contacts found")
                                .font(Theme.Fonts.body)
                                .foregroundColor(Theme.Colors.muted)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 48)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }

                Spacer(minLength: 0)

                // Bottom CTAs
                VStack(spacing: 12) {
                    // Selected counter pill
                    if selectedCount > 0 {
                        Text("\(selectedCount)/\(maxFriends) selected")
                            .font(Theme.Fonts.caption)
                            .foregroundColor(Theme.Colors.brand)
                            .kerning(1)
                            .textCase(.uppercase)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }

                    ContinueButton(
                        label: selectedCount > 0 ? "Continue >" : "Skip for now",
                        isEnabled: true,
                        fillDelay: nil
                    ) {
                        HapticsManager.shared.medium()
                        onComplete()
                    }
                    .padding(.horizontal, 24)
                }
                .padding(.bottom, 40)
                .animation(Theme.Springs.general, value: selectedCount)
            }
        }
        .onAppear {
            guard !appeared else { return }
            appeared = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                showPermissionPrompt = true
            }
        }
        .confirmationDialog(
            "Allow Reclip to access your contacts?",
            isPresented: $showPermissionPrompt,
            titleVisibility: .visible
        ) {
            Button("Allow Access") { requestContactsPermission() }
            Button("Not Now", role: .cancel) {
                permissionDenied = true
            }
        } message: {
            Text("We'll show you which friends are already on Reclip.")
        }
    }

    // MARK: Section Header

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(Theme.Fonts.caption)
            .foregroundColor(Theme.Colors.muted)
            .kerning(3)
            .textCase(.uppercase)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black)
    }

    // MARK: Contact Row

    @ViewBuilder
    private func contactRow(_ contact: Contact) -> some View {
        let idx = contacts.firstIndex(where: { $0.id == contact.id }) ?? 0
        let isSelected = contact.isSelected
        let canSelect  = isSelected || selectedCount < maxFriends

        HStack(spacing: 14) {
            // Avatar
            ZStack {
                Circle()
                    .fill(avatarColor(for: idx))
                    .frame(width: 44, height: 44)

                Text(contact.initials)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            // Name + handle
            VStack(alignment: .leading, spacing: 2) {
                Text(contact.name)
                    .font(Theme.Fonts.body)
                    .foregroundColor(.white)
                    .lineLimit(1)

                if let handle = contact.handle {
                    Text("@\(handle)")
                        .font(Theme.Fonts.caption)
                        .foregroundColor(Theme.Colors.muted)
                }
            }

            Spacer()

            // Selection indicator / Add button
            if contact.onReclip {
                Button {
                    guard canSelect || isSelected else {
                        HapticsManager.shared.warning()
                        return
                    }
                    toggleContact(at: idx)
                } label: {
                    ZStack {
                        Circle()
                            .fill(isSelected ? Theme.Colors.brand : Color.clear)
                            .frame(width: 28, height: 28)

                        Circle()
                            .stroke(isSelected ? Theme.Colors.brand : Color.white.opacity(0.25), lineWidth: 1.5)
                            .frame(width: 28, height: 28)

                        if isSelected {
                            Image(systemName: "checkmark")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.black)
                        }
                    }
                }
                .buttonStyle(.plain)
                .animation(Theme.Springs.buttonPress, value: isSelected)
            } else {
                // Invite pill
                Text("Invite")
                    .font(Theme.Fonts.caption)
                    .foregroundColor(Theme.Colors.brand)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .stroke(Theme.Colors.brand.opacity(0.5), lineWidth: 1)
                    )
            }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .onTapGesture {
            guard contact.onReclip else { return }
            guard canSelect || isSelected else {
                HapticsManager.shared.warning()
                return
            }
            toggleContact(at: idx)
        }
        .opacity((!canSelect && !isSelected) ? 0.4 : 1.0)
        .animation(Theme.Springs.general, value: isSelected)
        .animation(Theme.Springs.general, value: selectedCount)
    }

    // MARK: Helpers

    private func toggleContact(at index: Int) {
        contacts[index].isSelected.toggle()
        if contacts[index].isSelected {
            HapticsManager.shared.light()
        } else {
            HapticsManager.shared.selection()
        }
    }

    private func avatarColor(for index: Int) -> Color {
        let hex = Contact.avatarColors[index % Contact.avatarColors.count]
        return Color(hex: hex)
    }

    private func requestContactsPermission() {
        let store = CNContactStore()
        store.requestAccess(for: .contacts) { granted, _ in
            DispatchQueue.main.async {
                permissionGranted = granted
                permissionDenied  = !granted
            }
        }
    }
}

// MARK: - Placeholder extension for TextField

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

// MARK: - Previews

#if DEBUG
struct FriendLoopView_Previews: PreviewProvider {
    static var previews: some View {
        FriendLoopView(onComplete: {})
            .environmentObject(AppState())
            .preferredColorScheme(.dark)
    }
}
#endif
