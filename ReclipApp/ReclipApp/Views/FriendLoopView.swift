import SwiftUI

struct FriendLoopView: View {
    var onComplete: () -> Void

    @State private var contacts: [Contact] = Contact.samples
    @State private var searchText = ""
    @State private var showToast = false
    @State private var toastMessage = ""

    private let accentColor = Color(hex: "#DAFC79")
    private let maxFriends = 3

    private var filteredContacts: [Contact] {
        if searchText.isEmpty { return contacts }
        return contacts.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.handle?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    private var selectedContacts: [Contact] {
        contacts.filter { $0.isSelected }
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Text("Find Your Friends")
                        .font(.system(size: 30, weight: .black))
                        .foregroundColor(.white)
                    Text("Add up to \(maxFriends) friends to your inner circle")
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.55))
                }
                .padding(.top, 32)
                .padding(.bottom, 20)

                // Selected friends preview
                if !selectedContacts.isEmpty {
                    selectedFriendsRow
                        .padding(.horizontal, 24)
                        .padding(.bottom, 16)
                }

                // Search bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.white.opacity(0.4))
                    TextField("Search contacts", text: $searchText)
                        .foregroundColor(.white)
                        .tint(accentColor)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)
                .padding(.bottom, 8)

                // Contacts list
                ScrollView {
                    LazyVStack(spacing: 2) {
                        // On Reclip section
                        let onApp = filteredContacts.filter { $0.isOnReclip }
                        if !onApp.isEmpty {
                            sectionHeader("On Reclip")
                            ForEach(onApp.indices, id: \.self) { i in
                                if let idx = contacts.firstIndex(where: { $0.id == onApp[i].id }) {
                                    contactRow(contacts[idx], isOnApp: true) {
                                        toggleContact(idx)
                                    }
                                }
                            }
                        }

                        // Invite section
                        let notOnApp = filteredContacts.filter { !$0.isOnReclip }
                        if !notOnApp.isEmpty {
                            sectionHeader("Invite to Reclip")
                            ForEach(notOnApp.indices, id: \.self) { i in
                                if let idx = contacts.firstIndex(where: { $0.id == notOnApp[i].id }) {
                                    contactRow(contacts[idx], isOnApp: false) {
                                        toggleContact(idx)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 100)
                }

                Spacer(minLength: 0)
            }

            // Bottom CTA
            VStack {
                Spacer()
                VStack(spacing: 12) {
                    PrimaryButton(
                        label: selectedContacts.isEmpty ? "Skip for Now" : "Continue (\(selectedContacts.count))",
                        systemImage: selectedContacts.isEmpty ? nil : "arrow.right"
                    ) {
                        HapticsManager.shared.success()
                        onComplete()
                    }

                    if !selectedContacts.isEmpty {
                        Text("You'll appear in each other's feeds")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
                .background(
                    LinearGradient(
                        colors: [.black.opacity(0), .black],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 120)
                    .offset(y: -60)
                )
            }

            ToastOverlay(isShowing: $showToast, message: toastMessage)
        }
    }

    // MARK: - Subviews

    private var selectedFriendsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(selectedContacts) { contact in
                    VStack(spacing: 4) {
                        AsyncImage(url: URL(string: contact.photoURL)) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            Circle().fill(Color.white.opacity(0.1))
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(Circle())
                        .overlay(
                            Circle().stroke(accentColor, lineWidth: 2)
                        )
                        .overlay(
                            Button(action: {
                                if let idx = contacts.firstIndex(where: { $0.id == contact.id }) {
                                    toggleContact(idx)
                                }
                            }) {
                                ZStack {
                                    Circle().fill(Color.black)
                                        .frame(width: 18, height: 18)
                                    Image(systemName: "xmark")
                                        .font(.system(size: 8, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                            .offset(x: 14, y: -14),
                            alignment: .topTrailing
                        )

                        Text(contact.name.components(separatedBy: " ").first ?? "")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(1)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.white.opacity(0.4))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
            .padding(.top, 8)
    }

    private func contactRow(_ contact: Contact, isOnApp: Bool, action: @escaping () -> Void) -> some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: contact.photoURL)) { img in
                img.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color.white.opacity(0.15))
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                if let handle = contact.handle {
                    Text(handle)
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.45))
                }
            }

            Spacer()

            if isOnApp {
                Button(action: action) {
                    ZStack {
                        Capsule()
                            .fill(contact.isSelected ? accentColor : Color.white.opacity(0.1))
                        HStack(spacing: 4) {
                            if contact.isSelected {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.black)
                            }
                            Text(contact.isSelected ? "Added" : "Add")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(contact.isSelected ? .black : .white)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                    }
                    .frame(height: 32)
                    .fixedSize()
                }
            } else {
                Button(action: sendInvite) {
                    Text("Invite")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(accentColor)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .overlay(
                            Capsule().stroke(accentColor.opacity(0.5), lineWidth: 1)
                        )
                }
            }
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }

    // MARK: - Actions

    private func toggleContact(_ idx: Int) {
        let contact = contacts[idx]
        if contact.isSelected {
            contacts[idx].isSelected = false
            HapticsManager.shared.light()
        } else if selectedContacts.count < maxFriends {
            contacts[idx].isSelected = true
            HapticsManager.shared.medium()
        } else {
            toastMessage = "You can only add up to \(maxFriends) friends"
            showToast = true
            HapticsManager.shared.warning()
        }
    }

    private func sendInvite() {
        HapticsManager.shared.light()
        toastMessage = "Invite sent!"
        showToast = true
    }
}
