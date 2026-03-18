import SwiftUI

private enum OnboardingStep: Int, CaseIterable {
    case name, age, phone, otp, username

    var title: String {
        switch self {
        case .name: return "What's your name?"
        case .age: return "How old are you?"
        case .phone: return "Your phone number"
        case .otp: return "Enter verification code"
        case .username: return "Choose a username"
        }
    }

    var subtitle: String {
        switch self {
        case .name: return "We'll use this to personalize your experience"
        case .age: return "You must be 13 or older to use Reclip"
        case .phone: return "We'll send you a verification code"
        case .otp: return "Enter the 6-digit code we sent"
        case .username: return "This is how your friends will find you"
        }
    }

    var placeholder: String {
        switch self {
        case .name: return "Your first name"
        case .age: return "Your age"
        case .phone: return "+1 (555) 000-0000"
        case .otp: return "000000"
        case .username: return "@username"
        }
    }
}

struct OnboardingView: View {
    var onComplete: () -> Void

    @State private var step: OnboardingStep = .name
    @State private var name = ""
    @State private var age = ""
    @State private var phone = ""
    @State private var otp = ""
    @State private var username = ""
    @State private var isLoading = false
    @State private var fieldError: String?
    @FocusState private var isFocused: Bool

    private let accentColor = Color(hex: "#DAFC79")

    private var currentValue: Binding<String> {
        switch step {
        case .name: return $name
        case .age: return $age
        case .phone: return $phone
        case .otp: return $otp
        case .username: return $username
        }
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                        Rectangle()
                            .fill(accentColor)
                            .frame(width: geo.size.width * CGFloat(step.rawValue + 1) / CGFloat(OnboardingStep.allCases.count))
                            .animation(.spring(response: 0.4), value: step)
                    }
                }
                .frame(height: 3)

                // Back button
                HStack {
                    if step != .name {
                        Button(action: goBack) {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        }
                    }
                    Spacer()
                    ReclipLogoView()
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                Spacer()

                // Step content
                VStack(alignment: .leading, spacing: 24) {
                    // Step counter
                    Text("Step \(step.rawValue + 1) of \(OnboardingStep.allCases.count)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(accentColor)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(step.title)
                            .font(.system(size: 30, weight: .black))
                            .foregroundColor(.white)
                        Text(step.subtitle)
                            .font(.system(size: 15))
                            .foregroundColor(.white.opacity(0.55))
                    }

                    // Input field
                    inputField
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))

                    // Error
                    if let error = fieldError {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .foregroundColor(.red)
                        }
                        .font(.system(size: 14))
                    }
                }
                .padding(.horizontal, 24)
                .id(step) // forces transition on step change
                .animation(.easeInOut(duration: 0.25), value: step)

                Spacer()

                // Continue button
                PrimaryButton(
                    label: step == .username ? "Create Account" : "Continue",
                    isLoading: isLoading
                ) {
                    advance()
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .onAppear { isFocused = true }
    }

    @ViewBuilder
    private var inputField: some View {
        Group {
            switch step {
            case .otp:
                OTPField(value: $otp)
            default:
                TextField(step.placeholder, text: currentValue)
                    .keyboardType(step == .age ? .numberPad : step == .phone ? .phonePad : .default)
                    .textContentType(step == .name ? .givenName : step == .phone ? .telephoneNumber : step == .otp ? .oneTimeCode : .username)
                    .autocorrectionDisabled()
                    .focused($isFocused)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(16)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(accentColor.opacity(0.4), lineWidth: 1))
            }
        }
    }

    // MARK: - Navigation

    private func advance() {
        fieldError = nil
        let value = currentValue.wrappedValue.trimmingCharacters(in: .whitespaces)

        switch step {
        case .name:
            guard value.count >= 2 else { fieldError = "Please enter at least 2 characters"; return }
        case .age:
            guard let age = Int(value), age >= 13, age <= 120 else { fieldError = "Please enter a valid age (13+)"; return }
        case .phone:
            guard value.count >= 10 else { fieldError = "Please enter a valid phone number"; return }
        case .otp:
            guard value.count == 6 else { fieldError = "Please enter the 6-digit code"; return }
        case .username:
            guard value.count >= 3 else { fieldError = "Username must be at least 3 characters"; return }
        }

        HapticsManager.shared.light()

        if step == .username {
            finishOnboarding()
        } else {
            withAnimation {
                step = OnboardingStep(rawValue: step.rawValue + 1) ?? .username
            }
            isFocused = true
        }
    }

    private func goBack() {
        guard step.rawValue > 0 else { return }
        fieldError = nil
        HapticsManager.shared.light()
        withAnimation {
            step = OnboardingStep(rawValue: step.rawValue - 1) ?? .name
        }
        isFocused = true
    }

    private func finishOnboarding() {
        isLoading = true
        HapticsManager.shared.success()
        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            isLoading = false
            onComplete()
        }
    }
}

// MARK: - OTP Input Field
struct OTPField: View {
    @Binding var value: String
    private let length = 6
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack {
            // Hidden text field
            TextField("", text: $value)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .focused($isFocused)
                .frame(width: 1, height: 1)
                .opacity(0.001)
                .onChange(of: value) { v in
                    if v.count > length { value = String(v.prefix(length)) }
                    value = v.filter { $0.isNumber }
                }

            // Visual boxes
            HStack(spacing: 12) {
                ForEach(0..<length, id: \.self) { i in
                    let char = i < value.count ? String(value[value.index(value.startIndex, offsetBy: i)]) : ""
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(
                                        i < value.count
                                        ? Color(hex: "#DAFC79")
                                        : (isFocused && i == value.count ? Color.white.opacity(0.6) : Color.white.opacity(0.15)),
                                        lineWidth: 2
                                    )
                            )
                            .frame(width: 48, height: 60)
                        Text(char)
                            .font(.system(size: 24, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .onTapGesture { isFocused = true }
                }
            }
        }
        .onAppear { isFocused = true }
    }
}
