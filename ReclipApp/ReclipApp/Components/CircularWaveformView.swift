import SwiftUI

/// Circular waveform visualizer rendered with SwiftUI Canvas
struct CircularWaveformView: View {
    var levels: [Float]
    var isActive: Bool
    var baseColor: Color = Color(hex: "#DAFC79")
    var size: CGFloat = 280

    @State private var rotation: Double = 0
    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            // Outer glow ring
            Circle()
                .stroke(baseColor.opacity(isActive ? 0.15 : 0.05), lineWidth: 1)
                .frame(width: size + 40, height: size + 40)
                .scaleEffect(pulseScale)
                .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: pulseScale)

            // Waveform bars around circle
            Canvas { ctx, canvasSize in
                let center = CGPoint(x: canvasSize.width / 2, y: canvasSize.height / 2)
                let radius = size / 2
                let count = levels.count
                let barMaxHeight: CGFloat = 36
                let barWidth: CGFloat = 3

                for i in 0..<count {
                    let angle = (Double(i) / Double(count)) * 2 * .pi - .pi / 2
                    let level = CGFloat(levels[i])
                    let barHeight = max(4, level * barMaxHeight)

                    let innerX = center.x + cos(angle) * (radius - 2)
                    let innerY = center.y + sin(angle) * (radius - 2)
                    let outerX = center.x + cos(angle) * (radius + barHeight)
                    let outerY = center.y + sin(angle) * (radius + barHeight)

                    var path = Path()
                    path.move(to: CGPoint(x: innerX, y: innerY))
                    path.addLine(to: CGPoint(x: outerX, y: outerY))

                    let alpha = isActive ? Double(0.4 + level * 0.6) : 0.3
                    ctx.stroke(
                        path,
                        with: .color(baseColor.opacity(alpha)),
                        style: StrokeStyle(lineWidth: barWidth, lineCap: .round)
                    )
                }
            }
            .frame(width: size + 80, height: size + 80)
            .rotationEffect(.degrees(rotation))

            // Center circle
            Circle()
                .fill(Color.black)
                .frame(width: size, height: size)
                .overlay(
                    Circle()
                        .stroke(baseColor.opacity(isActive ? 0.6 : 0.2), lineWidth: 2)
                )
        }
        .onAppear {
            if isActive {
                withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
                pulseScale = 1.05
            }
        }
        .onChange(of: isActive) { active in
            if active {
                withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
                pulseScale = 1.05
            } else {
                rotation = 0
                pulseScale = 1.0
            }
        }
    }
}

// MARK: - Linear waveform for playback display
struct LinearWaveformView: View {
    var samples: [Float]
    var progress: CGFloat = 0
    var activeColor: Color = Color(hex: "#DAFC79")
    var inactiveColor: Color = .white.opacity(0.25)
    var height: CGFloat = 60

    var body: some View {
        GeometryReader { geo in
            Canvas { ctx, size in
                let count = samples.count
                guard count > 0 else { return }
                let barWidth = size.width / CGFloat(count)
                let center = size.height / 2

                for i in 0..<count {
                    let x = CGFloat(i) * barWidth + barWidth / 2
                    let barH = max(2, CGFloat(samples[i]) * size.height * 0.9)
                    let progressX = size.width * progress
                    let color = x <= progressX ? activeColor : inactiveColor

                    var path = Path()
                    path.move(to: CGPoint(x: x, y: center - barH / 2))
                    path.addLine(to: CGPoint(x: x, y: center + barH / 2))

                    ctx.stroke(path, with: .color(color),
                               style: StrokeStyle(lineWidth: max(1.5, barWidth * 0.6), lineCap: .round))
                }
            }
        }
        .frame(height: height)
    }
}
