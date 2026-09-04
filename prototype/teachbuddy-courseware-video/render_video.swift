import AppKit
import AVFoundation
import CoreVideo
import Foundation

let canvasWidth = 1280
let canvasHeight = 720
let fps: Int32 = 30
let frameDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

struct Scene {
    enum Content {
        case title
        case screenshot(String)
        case end
    }

    let content: Content
    let duration: Double
    let kicker: String
    let title: String
    let detail: String
    let highlight: Highlight?
    let callout: CGRect?
}

enum Highlight {
    case rounded(CGRect)
    case circle(CGPoint, CGFloat)
    case underline(CGRect)
    case double(CGRect, CGRect)
}

let scenes: [Scene] = [
    Scene(content: .title, duration: 1.8, kicker: "CLASSIN TEACHERIN", title: "从教学目标到可用课件", detail: "30 秒看完一次可审阅、可批准、可追溯的教师 AI 任务", highlight: nil, callout: nil),
    Scene(content: .screenshot("02-task-described.png"), duration: 2.8, kicker: "01 · 描述目标", title: "一句话提出课件任务", detail: "函数单调性 · 概念讲解 · 例题 · 课堂练习", highlight: .double(CGRect(x: 378, y: 220, width: 730, height: 184), CGRect(x: 378, y: 458, width: 116, height: 51)), callout: CGRect(x: 838, y: 72, width: 390, height: 132)),
    Scene(content: .screenshot("04-context-selected.png"), duration: 2.8, kicker: "02 · 冻结 CONTEXT", title: "只读取已授权、带来源的教学事实", detail: "机构、班级、课程、资源与课程标准进入同一版本快照", highlight: .rounded(CGRect(x: 838, y: 82, width: 416, height: 605)), callout: CGRect(x: 286, y: 502, width: 490, height: 136)),
    Scene(content: .screenshot("10-plan-review.png"), duration: 2.8, kicker: "03 · 确认计划", title: "参数与四步计划一次确认", detail: "45 分钟 · 人教版 · 理解 → 结构 → 组装 → 校验", highlight: .rounded(CGRect(x: 282, y: 192, width: 632, height: 420)), callout: CGRect(x: 918, y: 166, width: 320, height: 142)),
    Scene(content: .screenshot("11-executing-a.png"), duration: 1.4, kicker: "04 · 流式执行", title: "从理解教学目标开始", detail: "每一步都有输入、能力标识和预期产出", highlight: .double(CGRect(x: 280, y: 318, width: 635, height: 272), CGRect(x: 1050, y: 84, width: 178, height: 54)), callout: CGRect(x: 920, y: 178, width: 318, height: 142)),
    Scene(content: .screenshot("16-executing-step4.png"), duration: 1.4, kicker: "04 · 流式执行", title: "完成课件组装与质量校验", detail: "只保留首尾状态：过程可见，失败可恢复", highlight: .double(CGRect(x: 280, y: 318, width: 635, height: 272), CGRect(x: 1050, y: 84, width: 178, height: 54)), callout: CGRect(x: 920, y: 178, width: 318, height: 142)),
    Scene(content: .screenshot("18-global-preview.png"), duration: 3.0, kicker: "05 · 审阅 ARTIFACT", title: "18 页课件可全局预览", detail: "老师先检查结构，再逐页查看关键内容", highlight: .rounded(CGRect(x: 785, y: 84, width: 469, height: 606)), callout: CGRect(x: 278, y: 512, width: 462, height: 134)),
    Scene(content: .screenshot("20-preview-practice.png"), duration: 2.0, kicker: "05 · 审阅 ARTIFACT", title: "聚焦关键练习页", detail: "确认课堂活动和判断依据", highlight: .rounded(CGRect(x: 780, y: 151, width: 466, height: 470)), callout: CGRect(x: 282, y: 438, width: 444, height: 132)),
    Scene(content: .screenshot("24-approval-dialog.png"), duration: 3.2, kicker: "06 · APPROVAL", title: "确认目标、影响和版本后再批准", detail: "批准只是授权，尚未写入 ClassIn", highlight: .rounded(CGRect(x: 364, y: 188, width: 552, height: 354)), callout: CGRect(x: 42, y: 94, width: 332, height: 144)),
    Scene(content: .screenshot("28-receipt-final.png"), duration: 3.8, kicker: "07 · RECEIPT", title: "回执证明 ClassIn 已接受保存", detail: "对象版本、执行时间和采纳结果可追溯", highlight: .rounded(CGRect(x: 282, y: 196, width: 574, height: 182)), callout: CGRect(x: 918, y: 114, width: 320, height: 146)),
    Scene(content: .screenshot("30-my-files.png"), duration: 2.8, kicker: "08 · 资产沉淀", title: "课件进入“我的文件”", detail: "可收藏、分享、加入上下文或创建 TeacherIn 草稿", highlight: .double(CGRect(x: 268, y: 158, width: 964, height: 248), CGRect(x: 302, y: 228, width: 898, height: 78)), callout: CGRect(x: 788, y: 506, width: 444, height: 134)),
    Scene(content: .end, duration: 2.2, kicker: "TEACHERIN BUSINESS LOOP", title: "从“会生成”走到“能完成”", detail: "目标 → Context → Artifact → 审阅 → Approval → Receipt", highlight: nil, callout: nil),
]

let transitionDuration = 0.35
let totalDuration = scenes.reduce(0) { $0 + $1.duration }
let totalFrames = Int((totalDuration * Double(fps)).rounded())

func roundedRect(_ rect: CGRect, radius: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

func drawText(_ text: String, in rect: CGRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .left) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byWordWrapping
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ]
    NSAttributedString(string: text, attributes: attributes).draw(in: rect)
}

func ease(_ value: Double) -> CGFloat {
    let t = max(0, min(1, value))
    return CGFloat(t * t * (3 - 2 * t))
}

let imageCache: [String: NSImage] = Dictionary(uniqueKeysWithValues: scenes.compactMap { scene in
    guard case let .screenshot(name) = scene.content else { return nil }
    let image = NSImage(contentsOf: frameDirectory.appendingPathComponent(name))!
    return (name, image)
})

func drawScreenshot(_ image: NSImage, progress: Double, opacity: CGFloat) {
    let zoom = 1.0 + 0.018 * Double(ease(progress))
    let width = CGFloat(canvasWidth) * CGFloat(zoom)
    let height = CGFloat(canvasHeight) * CGFloat(zoom)
    let rect = CGRect(x: (CGFloat(canvasWidth) - width) / 2, y: (CGFloat(canvasHeight) - height) / 2, width: width, height: height)
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: opacity, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
}

func highlightCenter(_ highlight: Highlight) -> CGPoint {
    switch highlight {
    case let .rounded(rect), let .underline(rect):
        return CGPoint(x: rect.midX, y: rect.midY)
    case let .circle(center, _):
        return center
    case let .double(first, second):
        return CGPoint(x: (first.midX + second.midX) / 2, y: (first.midY + second.midY) / 2)
    }
}

func drawHighlightedRect(_ rect: CGRect, radius: CGFloat, progress: Double, opacity: CGFloat) {
    let accent = NSColor(calibratedRed: 0.01, green: 0.76, blue: 0.47, alpha: opacity)
    accent.withAlphaComponent(0.10 * opacity).setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
    let pulse = progress < 0.36 ? CGFloat(1 - progress / 0.36) : 0
    accent.withAlphaComponent((0.18 + 0.22 * pulse) * opacity).setStroke()
    let glow = NSBezierPath(roundedRect: rect.insetBy(dx: -5 - 4 * pulse, dy: -5 - 4 * pulse), xRadius: radius + 5, yRadius: radius + 5)
    glow.lineWidth = 8 + 5 * pulse
    glow.stroke()
    NSColor.white.withAlphaComponent(0.95 * opacity).setStroke()
    let whiteEdge = NSBezierPath(roundedRect: rect.insetBy(dx: -1.5, dy: -1.5), xRadius: radius + 1.5, yRadius: radius + 1.5)
    whiteEdge.lineWidth = 5
    whiteEdge.stroke()
    accent.setStroke()
    let edge = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    edge.lineWidth = 3
    edge.stroke()
}

func drawHighlight(_ highlight: Highlight, progress: Double, opacity: CGFloat) {
    switch highlight {
    case let .rounded(rect):
        drawHighlightedRect(rect, radius: 16, progress: progress, opacity: opacity)
    case let .circle(center, radius):
        drawHighlightedRect(CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2), radius: radius, progress: progress, opacity: opacity)
    case let .underline(rect):
        let line = NSBezierPath()
        line.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        line.line(to: CGPoint(x: rect.maxX, y: rect.maxY))
        NSColor.white.withAlphaComponent(0.95 * opacity).setStroke()
        line.lineWidth = 8
        line.stroke()
        NSColor(calibratedRed: 0.01, green: 0.76, blue: 0.47, alpha: opacity).setStroke()
        line.lineWidth = 4
        line.stroke()
    case let .double(first, second):
        drawHighlightedRect(first, radius: 16, progress: progress, opacity: opacity)
        drawHighlightedRect(second, radius: 12, progress: progress, opacity: opacity)
    }
}

func drawCallout(scene: Scene, progress: Double, opacity: CGFloat) {
    guard let highlight = scene.highlight, let callout = scene.callout else { return }
    let target = highlightCenter(highlight)
    let anchor = CGPoint(
        x: target.x >= callout.midX ? callout.maxX : callout.minX,
        y: min(callout.maxY - 20, max(callout.minY + 20, target.y))
    )
    let connector = NSBezierPath()
    connector.move(to: anchor)
    connector.line(to: target)
    NSColor.white.withAlphaComponent(0.82 * opacity).setStroke()
    connector.lineWidth = 5
    connector.stroke()
    NSColor(calibratedRed: 0.01, green: 0.76, blue: 0.47, alpha: opacity).setStroke()
    connector.lineWidth = 2.5
    connector.stroke()
    NSColor(calibratedRed: 0.01, green: 0.76, blue: 0.47, alpha: opacity).setFill()
    NSBezierPath(ovalIn: CGRect(x: target.x - 6, y: target.y - 6, width: 12, height: 12)).fill()

    roundedRect(callout, radius: 18, color: NSColor(calibratedRed: 0.025, green: 0.11, blue: 0.085, alpha: 0.93 * opacity))
    let pillWidth = min(callout.width - 40, CGFloat(scene.kicker.count * 13 + 34))
    roundedRect(CGRect(x: callout.minX + 18, y: callout.minY + 15, width: pillWidth, height: 26), radius: 13, color: NSColor(calibratedRed: 0.01, green: 0.68, blue: 0.42, alpha: 0.98 * opacity))
    drawText(scene.kicker, in: CGRect(x: callout.minX + 31, y: callout.minY + 20, width: pillWidth - 20, height: 18), font: .boldSystemFont(ofSize: 12), color: NSColor.white.withAlphaComponent(opacity))
    drawText(scene.title, in: CGRect(x: callout.minX + 19, y: callout.minY + 49, width: callout.width - 38, height: 46), font: .boldSystemFont(ofSize: 20), color: NSColor.white.withAlphaComponent(opacity))
    drawText(scene.detail, in: CGRect(x: callout.minX + 20, y: callout.minY + 95, width: callout.width - 40, height: callout.height - 103), font: .systemFont(ofSize: 14, weight: .medium), color: NSColor(calibratedWhite: 0.89, alpha: opacity))
}

func drawScreenshotOverlay(scene: Scene, sceneIndex: Int, progress: Double, opacity: CGFloat) {
    if let highlight = scene.highlight {
        drawHighlight(highlight, progress: progress, opacity: opacity)
    }
    drawCallout(scene: scene, progress: progress, opacity: opacity)

    let barWidth = CGFloat(canvasWidth - 32)
    roundedRect(CGRect(x: 16, y: 705, width: barWidth, height: 4), radius: 2, color: NSColor.black.withAlphaComponent(0.16 * opacity))
    let timelineProgress = (CGFloat(sceneIndex) + CGFloat(progress)) / CGFloat(max(1, scenes.count))
    roundedRect(CGRect(x: 16, y: 705, width: max(5, barWidth * timelineProgress), height: 4), radius: 2, color: NSColor(calibratedRed: 0.01, green: 0.76, blue: 0.47, alpha: opacity))
}

func drawTitleCard(kicker: String, title: String, detail: String, end: Bool) {
    let background = NSGradient(colorsAndLocations:
        (NSColor(calibratedRed: 0.025, green: 0.095, blue: 0.075, alpha: 1), 0),
        (NSColor(calibratedRed: 0.02, green: end ? 0.25 : 0.40, blue: end ? 0.22 : 0.30, alpha: 1), 1)
    )!
    background.draw(in: CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight), angle: 0)
    NSColor(calibratedRed: 0.02, green: 0.78, blue: 0.50, alpha: 0.10).setFill()
    NSBezierPath(ovalIn: CGRect(x: 780, y: -180, width: 700, height: 700)).fill()
    roundedRect(CGRect(x: 74, y: 102, width: min(360, CGFloat(kicker.count * 16 + 44)), height: 38), radius: 19, color: NSColor(calibratedRed: 0.02, green: 0.72, blue: 0.46, alpha: 0.92))
    drawText(kicker, in: CGRect(x: 94, y: 111, width: 330, height: 24), font: .boldSystemFont(ofSize: 15), color: .white)
    drawText(title, in: CGRect(x: 74, y: 210, width: 1080, height: 90), font: .boldSystemFont(ofSize: 55), color: .white)
    drawText(detail, in: CGRect(x: 78, y: 326, width: 1040, height: 55), font: .systemFont(ofSize: 25, weight: .medium), color: NSColor(calibratedWhite: 0.90, alpha: 1))
    if end {
        let steps = ["目标", "Context", "Artifact", "审阅", "Approval", "Receipt"]
        for (index, step) in steps.enumerated() {
            let x = 76 + CGFloat(index) * 190
            roundedRect(CGRect(x: x, y: 458, width: 142, height: 58), radius: 16, color: NSColor.white.withAlphaComponent(index == steps.count - 1 ? 0.20 : 0.10))
            drawText(step, in: CGRect(x: x, y: 476, width: 142, height: 26), font: .boldSystemFont(ofSize: 18), color: .white, alignment: .center)
            if index < steps.count - 1 {
                drawText("→", in: CGRect(x: x + 146, y: 472, width: 42, height: 30), font: .boldSystemFont(ofSize: 24), color: NSColor(calibratedRed: 0.16, green: 0.86, blue: 0.60, alpha: 1), alignment: .center)
            }
        }
    } else {
        drawText("真实 Demo 路径 · 站内终局 TeacherIn", in: CGRect(x: 78, y: 472, width: 760, height: 30), font: .boldSystemFont(ofSize: 19), color: NSColor(calibratedRed: 0.20, green: 0.90, blue: 0.65, alpha: 1))
    }
}

try? FileManager.default.removeItem(at: outputURL)
let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: canvasWidth,
    AVVideoHeightKey: canvasHeight,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 8_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: canvasWidth,
        kCVPixelBufferHeightKey as String: canvasHeight,
    ]
)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
guard writer.startWriting() else { throw writer.error! }
writer.startSession(atSourceTime: .zero)

var sceneStart = 0.0
var sceneIndex = 0
for frameIndex in 0..<totalFrames {
    let time = Double(frameIndex) / Double(fps)
    while sceneIndex < scenes.count - 1 && time >= sceneStart + scenes[sceneIndex].duration {
        sceneStart += scenes[sceneIndex].duration
        sceneIndex += 1
    }
    let scene = scenes[sceneIndex]
    let localTime = time - sceneStart
    let progress = max(0, min(1, localTime / scene.duration))

    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
    guard let pixelBuffer = buffer else { fatalError("Cannot allocate pixel buffer") }
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: canvasWidth,
        height: canvasHeight,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    )!
    context.translateBy(x: 0, y: CGFloat(canvasHeight))
    context.scaleBy(x: 1, y: -1)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
    NSColor.black.setFill()
    NSBezierPath(rect: CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight)).fill()

    switch scene.content {
    case .title:
        drawTitleCard(kicker: scene.kicker, title: scene.title, detail: scene.detail, end: false)
    case .end:
        drawTitleCard(kicker: scene.kicker, title: scene.title, detail: scene.detail, end: true)
    case let .screenshot(name):
        let opacity: CGFloat
        if localTime < transitionDuration {
            opacity = ease(localTime / transitionDuration)
        } else if scene.duration - localTime < transitionDuration {
            opacity = ease((scene.duration - localTime) / transitionDuration)
        } else {
            opacity = 1
        }
        drawScreenshot(imageCache[name]!, progress: progress, opacity: opacity)
        drawScreenshotOverlay(scene: scene, sceneIndex: sceneIndex, progress: progress, opacity: opacity)
    }

    NSGraphicsContext.restoreGraphicsState()
    CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    let presentationTime = CMTime(value: Int64(frameIndex), timescale: fps)
    if !adaptor.append(pixelBuffer, withPresentationTime: presentationTime) {
        throw writer.error ?? NSError(domain: "TeacherInVideo", code: 1)
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()
if writer.status != .completed {
    throw writer.error ?? NSError(domain: "TeacherInVideo", code: 2)
}
print("Rendered \(outputURL.path) · \(String(format: "%.1f", totalDuration))s · \(totalFrames) frames")
