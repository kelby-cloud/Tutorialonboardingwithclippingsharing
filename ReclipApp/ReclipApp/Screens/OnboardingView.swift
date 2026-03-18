import SwiftUI
import UIKit

// MARK: - OnboardingView

struct OnboardingView: View {
    var onComplete: () -> Void

    @EnvironmentObject private var appState: AppState

    @State private var step = 0
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var birthdayDigits = ""   // raw digits MMDDYYYY
    @State private var phone = ""            // raw digits
    @State private var countryCode = "+1"
    @State private var otp = ""
    @State private var username = ""
    @State private var isTransitioning = false

    private let stepCount = 5
    private let brand = Color(hex: "DAFC79")
    private let accent = Color(hex: "00C8FF")
    private let muted = Color(red: 155/255, green: 155/255, blue: 155/255)
    private let destructive = Color(hex: "FC3158")

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Logo
                ReclipLogoView()
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 20)

                // Progress dots
                ProgressDots(count: stepCount, current: step) { tappedStep in
                    if tappedStep < step { withAnimation { step = tappedStep } }
                }
                .padding(.top, 16)

                // Step content
                ZStack {
                    if step == 0 { nameStep.transition(stepTransition) }
                    if step == 1 { birthdayStep.transition(stepTransition) }
                    if step == 2 { phoneStep.transition(stepTransition) }
                    if step == 3 { otpStep.transition(stepTransition) }
                    if step == 4 { usernameStep.transition(stepTransition) }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .animation(.easeInOut(duration: 0.35), value: step)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private var stepTransition: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        )
    }

    // MARK: - Step 0: Name

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            backButton
            Text("What's your name?")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.top, 28)

            Spacer().frame(height: 32)

            NameFieldRow(
                placeholder: "FIRST NAME",
                value: $firstName,
                autoFocus: true
            )
            .padding(.bottom, 20)

            NameFieldRow(
                placeholder: "LAST NAME",
                value: $lastName,
                autoFocus: false
            )

            Spacer()

            continueButton(enabled: !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
                                     !lastName.trimmingCharacters(in: .whitespaces).isEmpty) {
                advance()
            }
        }
    }

    // MARK: - Step 1: Birthday

    private var birthdayStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            backButton
            Text("Hi \(firstName), when's your birthday?")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.top, 28)

            Spacer().frame(height: 32)

            BirthdayField(digits: $birthdayDigits,
                          brand: brand, accent: accent, muted: muted, destructive: destructive)

            Spacer()

            let bValid = isBirthdayValid(birthdayDigits)
            continueButton(enabled: bValid.valid) { advance() }
        }
    }

    // MARK: - Step 2: Phone

    private var phoneStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            backButton
            Text("What's your phone number?")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.top, 28)

            Spacer().frame(height: 32)

            PhoneField(phone: $phone, countryCode: $countryCode,
                       brand: brand, accent: accent, muted: muted)

            Spacer()

            continueButton(enabled: phone.count >= 10) { advance() }
        }
    }

    // MARK: - Step 3: OTP

    private var otpStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            backButton
            Text("Enter the code we sent to \(formattedPhone)")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.top, 28)

            Spacer().frame(height: 32)

            OTPField(otp: $otp, accent: accent, muted: muted, destructive: destructive) {
                // auto-advance after verification
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    advance()
                }
            }

            Spacer()

            continueButton(enabled: otp.count == 6) { advance() }
        }
    }

    // MARK: - Step 4: Username

    private var usernameStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            backButton
            Text("Choose a username")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.top, 28)

            Spacer().frame(height: 32)

            UsernameField(username: $username,
                          brand: brand, accent: accent, muted: muted, destructive: destructive)

            Spacer()

            let uValid = isUsernameValid(username)
            continueButton(enabled: uValid) {
                HapticsManager.shared.success()
                onComplete()
            }
        }
    }

    // MARK: - Helpers

    private var backButton: some View {
        Group {
            if step > 0 {
                Button(action: {
                    HapticsManager.shared.light()
                    withAnimation(.easeInOut(duration: 0.35)) { step -= 1 }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .semibold))
                        Text("Back")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(muted)
                }
                .padding(.top, 12)
            } else {
                Color.clear.frame(height: 36)
            }
        }
    }

    @ViewBuilder
    private func continueButton(enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            if enabled {
                HapticsManager.shared.medium()
                action()
            } else {
                HapticsManager.shared.warning()
            }
        }) {
            HStack(spacing: 8) {
                Text("Continue")
                    .font(.system(size: 18, weight: .bold))
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .bold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 58)
            .background(enabled ? brand : Color.clear)
            .foregroundColor(enabled ? .black : muted.opacity(0.5))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(enabled ? Color.clear : muted.opacity(0.2), lineWidth: 1.5)
            )
            .animation(.easeInOut(duration: 0.4), value: enabled)
        }
    }

    private func advance() {
        withAnimation(.easeInOut(duration: 0.35)) { step += 1 }
    }

    private var formattedPhone: String {
        let d = phone
        guard d.count >= 10 else { return countryCode + " " + d }
        let area = String(d.prefix(3))
        let mid  = String(d.dropFirst(3).prefix(3))
        let last = String(d.dropFirst(6).prefix(4))
        return "\(countryCode) (\(area)) \(mid)-\(last)"
    }

    private func isBirthdayValid(_ digits: String) -> (valid: Bool, error: String?) {
        guard digits.count == 8 else { return (false, nil) }
        let mm   = Int(digits.prefix(2)) ?? 0
        let dd   = Int(digits.dropFirst(2).prefix(2)) ?? 0
        let yyyy = Int(digits.dropFirst(4)) ?? 0
        guard (1...12).contains(mm)    else { return (false, "Invalid month") }
        guard (1...31).contains(dd)    else { return (false, "Invalid day") }
        let cal  = Calendar.current
        var comps = DateComponents(); comps.year = yyyy; comps.month = mm; comps.day = dd
        guard let date = cal.date(from: comps), date <= Date() else { return (false, "Birthday can't be in the future") }
        let age  = cal.dateComponents([.year], from: date, to: Date()).year ?? 0
        guard age >= 13  else { return (false, "You must be at least 13 to use Reclip") }
        guard age <= 120 else { return (false, "Please enter a valid birth year") }
        return (true, nil)
    }

    private func isUsernameValid(_ u: String) -> Bool {
        guard u.count >= 3, u.count <= 20 else { return false }
        let regex = try? NSRegularExpression(pattern: "^[a-z0-9_.]+$")
        let range = NSRange(u.startIndex..., in: u)
        guard regex?.firstMatch(in: u, range: range) != nil else { return false }
        guard !u.contains("__"), !u.contains(".."), !u.contains("._"), !u.contains("_.") else { return false }
        let bad: [Character] = ["_", "."]
        guard !bad.contains(u.first!), !bad.contains(u.last!) else { return false }
        return true
    }
}

// MARK: - NameFieldRow

private struct NameFieldRow: View {
    let placeholder: String
    @Binding var value: String
    let autoFocus: Bool

    @FocusState private var focused: Bool
    private let brand = Color(hex: "DAFC79")
    private let muted = Color(red: 155/255, green: 155/255, blue: 155/255)

    var body: some View {
        ZStack(alignment: .leading) {
            // Styled display text
            HStack(spacing: 0) {
                if value.isEmpty {
                    Text(placeholder)
                        .font(.system(size: 48, weight: .black))
                        .foregroundColor(muted.opacity(0.35))
                } else {
                    Text(value.uppercased())
                        .font(.system(size: 50, weight: .black))
                        .foregroundColor(.white)
                }
                if focused {
                    BlinkingCursor()
                }
                Spacer()
            }

            // Hidden text field
            TextField("", text: $value)
                .font(.system(size: 50, weight: .black))
                .autocapitalization(.words)
                .opacity(0.01)
                .focused($focused)
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .onAppear {
            if autoFocus {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { focused = true }
            }
        }
    }
}

// MARK: - BirthdayField

private struct BirthdayField: View {
    @Binding var digits: String
    let brand: Color; let accent: Color; let muted: Color; let destructive: Color

    @FocusState private var focused: Bool
    @State private var error: String? = nil

    private var mm:   String { String(digits.prefix(2)) }
    private var dd:   String { String(digits.dropFirst(2).prefix(2)) }
    private var yyyy: String { String(digits.dropFirst(4).prefix(4)) }

    private var cursorSegment: Int {
        if digits.count < 2 { return 0 }
        if digits.count < 4 { return 1 }
        if digits.count < 8 { return 2 }
        return -1
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 20) {
                segment(value: mm, placeholder: "MM", isCurrent: cursorSegment == 0)
                Text("/").font(.system(size: 40, weight: .black)).foregroundColor(muted.opacity(0.35))
                segment(value: dd, placeholder: "DD", isCurrent: cursorSegment == 1)
                Text("/").font(.system(size: 40, weight: .black)).foregroundColor(muted.opacity(0.35))
                segment(value: yyyy, placeholder: "YYYY", isCurrent: cursorSegment == 2)
            }

            // Hidden tel input
            TextField("", text: $digits)
                .keyboardType(.numberPad)
                .focused($focused)
                .onChange(of: digits) { v in
                    digits = String(v.filter(\.isNumber).prefix(8))
                }
                .opacity(0.01)
                .frame(height: 1)

            if let err = error {
                ErrorPill(message: err)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { focused = true } }
    }

    @ViewBuilder
    private func segment(value: String, placeholder: String, isCurrent: Bool) -> some View {
        HStack(spacing: 0) {
            if value.isEmpty {
                Text(placeholder)
                    .font(.system(size: 48, weight: .black))
                    .foregroundColor(muted.opacity(0.35))
            } else {
                Text(value)
                    .font(.system(size: 50, weight: .black))
                    .foregroundColor(.white)
            }
            if isCurrent { BlinkingCursor() }
        }
    }
}

// MARK: - PhoneField

private struct PhoneField: View {
    @Binding var phone: String
    @Binding var countryCode: String
    let brand: Color; let accent: Color; let muted: Color

    @FocusState private var focused: Bool
    @State private var showPicker = false

    private let countryCodes: [(code: String, flag: String, label: String)] = [
        ("+1","🇺🇸","US"),("+44","🇬🇧","UK"),("+91","🇮🇳","IN"),
        ("+61","🇦🇺","AU"),("+81","🇯🇵","JP"),("+49","🇩🇪","DE"),
        ("+33","🇫🇷","FR"),("+55","🇧🇷","BR"),("+82","🇰🇷","KR"),("+52","🇲🇽","MX"),
    ]

    private var formatted: String {
        let d = phone
        guard d.count >= 1 else { return "" }
        if d.count <= 3 { return "(\(d)" }
        if d.count <= 6 { return "(\(d.prefix(3))) \(d.dropFirst(3))" }
        return "(\(d.prefix(3))) \(d.dropFirst(3).prefix(3)) \(d.dropFirst(6))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                // Country code button
                Button(action: { showPicker = true }) {
                    HStack(spacing: 6) {
                        Text(countryCodes.first(where: { $0.code == countryCode })?.flag ?? "🇺🇸")
                            .font(.system(size: 22))
                        Text(countryCode)
                            .font(.system(size: 36, weight: .black))
                            .foregroundColor(accent)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12))
                            .foregroundColor(muted)
                    }
                }

                // Phone display
                HStack(spacing: 0) {
                    if phone.isEmpty {
                        Text("(000) 000 0000")
                            .font(.system(size: 48, weight: .black))
                            .foregroundColor(muted.opacity(0.35))
                    } else {
                        Text(formatted)
                            .font(.system(size: 50, weight: .black))
                            .foregroundColor(.white)
                    }
                    if focused { BlinkingCursor() }
                }
            }

            // Hidden input
            TextField("", text: $phone)
                .keyboardType(.numberPad)
                .focused($focused)
                .onChange(of: phone) { v in
                    phone = String(v.filter(\.isNumber).prefix(10))
                }
                .opacity(0.01)
                .frame(height: 1)

            Text("We'll send you a verification code")
                .font(.system(size: 13))
                .foregroundColor(muted)
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { focused = true } }
        .confirmationDialog("Select Country Code", isPresented: $showPicker) {
            ForEach(countryCodes, id: \.code) { c in
                Button("\(c.flag) \(c.label) \(c.code)") { countryCode = c.code }
            }
        }
    }
}

// MARK: - OTPField

private struct OTPField: View {
    @Binding var otp: String
    let accent: Color; let muted: Color; let destructive: Color
    var onComplete: () -> Void

    @FocusState private var focused: Bool
    @State private var isVerifying = false
    @State private var resendCountdown = 30
    @State private var countdownTimer: Timer? = nil

    var body: some View {
        VStack(spacing: 24) {
            // 6 digit boxes
            HStack(spacing: 8) {
                ForEach(0..<6, id: \.self) { i in
                    let char = i < otp.count ? String(otp[otp.index(otp.startIndex, offsetBy: i)]) : ""
                    let isActive = (i == otp.count) && focused

                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white.opacity(0.04))
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isActive ? accent : (char.isEmpty ? muted.opacity(0.15) : muted.opacity(0.25)),
                                    lineWidth: isActive ? 1.5 : 1)

                        if char.isEmpty {
                            if isActive { BlinkingCursor() }
                        } else {
                            Text(char)
                                .font(.system(size: 36, weight: .black))
                                .foregroundColor(.white)
                        }
                    }
                    .frame(width: 44, height: 56)
                    .scaleEffect(isActive ? 1.05 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
                }
            }

            // Hidden input
            TextField("", text: $otp)
                .keyboardType(.numberPad)
                .focused($focused)
                .onChange(of: otp) { v in
                    otp = String(v.filter(\.isNumber).prefix(6))
                    if otp.count == 6 {
                        isVerifying = true
                        onComplete()
                    }
                }
                .opacity(0.01)
                .frame(height: 1)

            // Verifying / resend
            if isVerifying {
                HStack(spacing: 6) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: accent))
                        .scaleEffect(0.8)
                    Text("Verifying...")
                        .font(.system(size: 13))
                        .foregroundColor(muted)
                }
            } else {
                Button(action: {
                    guard resendCountdown == 0 else { return }
                    HapticsManager.shared.light()
                    resendCountdown = 30
                    startCountdown()
                }) {
                    Text(resendCountdown > 0 ? "Resend in \(resendCountdown)s" : "Resend code")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(resendCountdown > 0 ? muted : accent)
                }
                .disabled(resendCountdown > 0)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { focused = true }
            startCountdown()
        }
        .onDisappear { countdownTimer?.invalidate() }
    }

    private func startCountdown() {
        countdownTimer?.invalidate()
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if resendCountdown > 0 { resendCountdown -= 1 } else { countdownTimer?.invalidate() }
        }
    }
}

// MARK: - UsernameField

private struct UsernameField: View {
    @Binding var username: String
    let brand: Color; let accent: Color; let muted: Color; let destructive: Color

    @FocusState private var focused: Bool
    @State private var checkState: CheckState = .idle

    enum CheckState { case idle, checking, available, taken }

    private let takenNames = ["admin", "reclip", "test", "user"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Display
            HStack(spacing: 0) {
                Text("@")
                    .font(.system(size: 36, weight: .black))
                    .foregroundColor(accent)

                HStack(spacing: 0) {
                    if username.isEmpty {
                        Text("Your username")
                            .font(.system(size: 48, weight: .black))
                            .foregroundColor(muted.opacity(0.35))
                    } else {
                        Text(username)
                            .font(.system(size: 50, weight: .black))
                            .foregroundColor(.white)
                    }
                    if focused { BlinkingCursor() }
                }
            }

            // Hidden input
            TextField("", text: $username)
                .focused($focused)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .onChange(of: username) { v in
                    username = String(v.lowercased().filter { $0.isLetter || $0.isNumber || $0 == "_" || $0 == "." }.prefix(20))
                    triggerCheck()
                }
                .opacity(0.01)
                .frame(height: 1)

            // Availability indicator
            switch checkState {
            case .checking:
                HStack(spacing: 6) {
                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: accent)).scaleEffect(0.7)
                    Text("Checking...").font(.system(size: 13)).foregroundColor(muted)
                }
            case .available:
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill").font(.system(size: 14)).foregroundColor(brand)
                    Text("@\(username) is available").font(.system(size: 13)).foregroundColor(brand)
                }
            case .taken:
                ErrorPill(message: "Username is already taken")
            case .idle:
                Text("This is how your friends will find you")
                    .font(.system(size: 13))
                    .foregroundColor(muted)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { focused = true } }
    }

    private func triggerCheck() {
        guard username.count >= 3 else { checkState = .idle; return }
        checkState = .checking
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            checkState = takenNames.contains(username) ? .taken : .available
        }
    }
}

// MARK: - BlinkingCursor

struct BlinkingCursor: View {
    @State private var visible = true
    private let accent = Color(hex: "00C8FF")

    var body: some View {
        Rectangle()
            .fill(accent)
            .frame(width: 2, height: 50)
            .opacity(visible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
                    visible = false
                }
            }
    }
}
