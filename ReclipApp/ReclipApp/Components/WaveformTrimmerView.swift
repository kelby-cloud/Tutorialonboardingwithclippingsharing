import SwiftUI

/// Interactive waveform trimmer with draggable start/end handles
struct WaveformTrimmerView: View {
    var samples: [Float]
    @Binding var startProgress: CGFloat
    @Binding var endProgress: CGFloat
    var duration: Double
    var activeColor: Color = Color(hex: "#DAFC79")
    var height: CGFloat = 80

    @State private var isDraggingStart = false
    @State private var isDraggingEnd = false

    private let handleWidth: CGFloat = 20
    private let minClipDuration: CGFloat = 0.05 // 5% minimum selection

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                // Background waveform
                waveformCanvas(size: geo.size, highlighted: false)

                // Selected region
                waveformCanvas(size: geo.size, highlighted: true)
                    .mask(
                        Rectangle()
                            .frame(
                                width: (endProgress - startProgress) * geo.size.width,
                                height: height
                            )
                            .offset(x: startProgress * geo.size.width)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    )

                // Selection overlay tint
                Rectangle()
                    .fill(activeColor.opacity(0.08))
                    .frame(width: (endProgress - startProgress) * geo.size.width)
                    .offset(x: startProgress * geo.size.width)

                // Start handle
                trimHandle(isDragging: isDraggingStart)
                    .position(x: startProgress * geo.size.width, y: geo.size.height / 2)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                isDraggingStart = true
                                HapticsManager.shared.selection()
                                let new = (value.location.x / geo.size.width).clamped(to: 0...(endProgress - minClipDuration))
                                startProgress = new
                            }
                            .onEnded { _ in isDraggingStart = false }
                    )

                // End handle
                trimHandle(isDragging: isDraggingEnd)
                    .position(x: endProgress * geo.size.width, y: geo.size.height / 2)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                isDraggingEnd = true
                                HapticsManager.shared.selection()
                                let new = (value.location.x / geo.size.width).clamped(to: (startProgress + minClipDuration)...1.0)
                                endProgress = new
                            }
                            .onEnded { _ in isDraggingEnd = false }
                    )

                // Border lines at handles
                Rectangle()
                    .fill(activeColor)
                    .frame(width: 2, height: height)
                    .position(x: startProgress * geo.size.width, y: geo.size.height / 2)
                    .allowsHitTesting(false)

                Rectangle()
                    .fill(activeColor)
                    .frame(width: 2, height: height)
                    .position(x: endProgress * geo.size.width, y: geo.size.height / 2)
                    .allowsHitTesting(false)
            }
        }
        .frame(height: height)
    }

    @ViewBuilder
    private func trimHandle(isDragging: Bool) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(isDragging ? Color.white : activeColor)
                .frame(width: handleWidth, height: height * 0.6)
                .shadow(color: activeColor.opacity(0.6), radius: isDragging ? 8 : 4)
            Rectangle()
                .fill(isDragging ? Color.black.opacity(0.4) : Color.black.opacity(0.6))
                .frame(width: 2, height: height * 0.3)
        }
    }

    private func waveformCanvas(size: CGSize, highlighted: Bool) -> some View {
        Canvas { ctx, canvasSize in
            let count = samples.count
            guard count > 0 else { return }
            let barWidth = canvasSize.width / CGFloat(count)
            let center = canvasSize.height / 2
            let color: Color = highlighted ? activeColor : .white.opacity(0.3)

            for i in 0..<count {
                let x = CGFloat(i) * barWidth + barWidth / 2
                let barH = max(2, CGFloat(samples[i]) * canvasSize.height * 0.85)

                var path = Path()
                path.move(to: CGPoint(x: x, y: center - barH / 2))
                path.addLine(to: CGPoint(x: x, y: center + barH / 2))

                ctx.stroke(path, with: .color(color),
                           style: StrokeStyle(lineWidth: max(1.5, barWidth * 0.55), lineCap: .round))
            }
        }
        .frame(width: size.width, height: size.height)
    }
}

// MARK: - Comparable+clamped helper
extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
