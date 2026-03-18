import SwiftUI

struct ToastView: View {
    let message: String
    var systemImage: String? = "checkmark.circle.fill"

    var body: some View {
        HStack(spacing: 10) {
            if let icon = systemImage {
                Image(systemName: icon)
                    .foregroundColor(Color(hex: "#DAFC79"))
                    .font(.system(size: 16, weight: .semibold))
            }
            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .background(Color.white.opacity(0.1))
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.3), radius: 12, y: 4)
        .padding(.top, 60)
        .frame(maxWidth: .infinity, alignment: .center)
    }
}

/// A toast presenter that manages show/hide state
struct ToastOverlay: View {
    @Binding var isShowing: Bool
    var message: String
    var duration: Double = 2.5

    var body: some View {
        VStack {
            if isShowing {
                ToastView(message: message)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                isShowing = false
                            }
                        }
                    }
            }
            Spacer()
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: isShowing)
        .zIndex(999)
    }
}

/// MicPermissionModal
struct MicPermissionModal: View {
    var onAllow: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(hex: "#DAFC79").opacity(0.15))
                    .frame(width: 100, height: 100)
                Image(systemName: "mic.fill")
                    .font(.system(size: 40))
                    .foregroundColor(Color(hex: "#DAFC79"))
            }

            VStack(spacing: 12) {
                Text("Microphone Access")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                Text("Reclip needs access to your microphone to record audio clips.")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 12) {
                PrimaryButton(label: "Allow Microphone", systemImage: "mic") {
                    onAllow()
                }

                Button("Not Now") {
                    HapticsManager.shared.light()
                    onDismiss()
                }
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.5))
            }
            .padding(.horizontal, 32)

            Spacer()
        }
        .background(Color.black)
        .ignoresSafeArea()
    }
}
