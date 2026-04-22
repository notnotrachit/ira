import WidgetKit
import SwiftUI
import EventKit
import HealthKit
import MediaPlayer

private let appGroup = "group.com.ira.app.shared"
private let payloadKey = "ira_widget_payload"

// MARK: - Models

struct WidgetAction: Codable { let label: String; let deepLink: String }
struct WidgetSuggestion: Codable { let message: String; let deepLink: String? }
struct WidgetState: Codable {
    let status: String; let unreadCount: Int?; let topMessagePreview: String?
    let quickActions: [WidgetAction]; let topSuggestion: WidgetSuggestion?; let lastUpdatedAt: String
}
struct WidgetVariantData: Codable { let small: WidgetState; let medium: WidgetState; let large: WidgetState; let lock: WidgetState }
struct SharedWidgetPayload: Codable { let variantData: WidgetVariantData; let generatedAt: String }
struct IraWidgetEntry: TimelineEntry { let date: Date; let payload: SharedWidgetPayload }

// MARK: - Data Fetcher

private enum Fetcher {
    struct Ctx { var event: (title: String, start: Date, location: String?)?; var steps: Double?; var track: String?; var artist: String?; var playing: Bool = false }

    static func fetch(completion: @escaping (Ctx) -> Void) {
        var c = Ctx()
        c.event = readEvent(); readMusic(&c)
        readSteps { c.steps = $0; completion(c) }
    }

    static func readEvent() -> (String, Date, String?)? {
        let s = EKEventStore.authorizationStatus(for: .event)
        var ok = s == .authorized; if #available(iOS 17.0, *) { ok = ok || s == .fullAccess }
        guard ok else { return nil }
        let store = EKEventStore(); let now = Date()
        let events = store.events(matching: store.predicateForEvents(withStart: now, end: now.addingTimeInterval(86400), calendars: nil)).sorted { $0.startDate < $1.startDate }
        guard let e = events.first else { return nil }
        return (e.title ?? "Event", e.startDate, e.location)
    }

    static func readMusic(_ c: inout Ctx) {
        guard MPMediaLibrary.authorizationStatus() == .authorized else { return }
        let p = MPMusicPlayerController.systemMusicPlayer
        if let item = p.nowPlayingItem { c.track = item.title; c.artist = item.artist; c.playing = p.playbackState == .playing }
    }

    static func readSteps(completion: @escaping (Double?) -> Void) {
        #if targetEnvironment(simulator)
        completion(nil); return
        #endif
        guard HKHealthStore.isHealthDataAvailable(), let t = HKQuantityType.quantityType(forIdentifier: .stepCount) else { completion(nil); return }
        let store = HKHealthStore(); let sod = Calendar.current.startOfDay(for: Date())
        let q = HKStatisticsQuery(quantityType: t, quantitySamplePredicate: HKQuery.predicateForSamples(withStart: sod, end: Date(), options: .strictStartDate), options: .cumulativeSum) { _, r, _ in
            completion(r?.sumQuantity()?.doubleValue(for: .count()))
        }
        store.execute(q)
    }
}

// MARK: - Payload Builder

private enum Builder {
    static func build(from c: Fetcher.Ctx, at d: Date) -> SharedWidgetPayload {
        let dp = daypart(d); let has = c.event != nil || c.steps != nil || c.playing
        let preview = buildPreview(c, dp); let sugg = buildSugg(c, dp); let actions = buildActions(c)
        let status = has ? "ready" : "empty"; let time = timeStr(d)
        func v(_ max: Int) -> WidgetState { WidgetState(status: status, unreadCount: 0, topMessagePreview: preview, quickActions: Array(actions.prefix(max)), topSuggestion: sugg, lastUpdatedAt: time) }
        return SharedWidgetPayload(variantData: WidgetVariantData(small: v(1), medium: v(2), large: v(3), lock: v(1)), generatedAt: ISO8601DateFormatter().string(from: d))
    }

    static func buildPreview(_ c: Fetcher.Ctx, _ dp: String) -> String {
        if let e = c.event { let m = Int(e.start.timeIntervalSince(Date()) / 60); return m > 0 && m <= 30 ? "\(e.title) in \(m) min" : e.title }
        if let t = c.track, c.playing { return "Now playing \(t)\(c.artist.map { " — \($0)" } ?? "")" }
        if let s = c.steps, s < 4000 { return Calendar.current.component(.hour, from: Date()) >= 17 ? "Time for an evening walk." : "Under 4k steps today." }
        return dp == "morning" ? "A quiet start." : dp == "afternoon" ? "Nothing urgent." : "A calm evening."
    }

    static func buildSugg(_ c: Fetcher.Ctx, _ dp: String) -> WidgetSuggestion? {
        if let e = c.event { let m = Int(e.start.timeIntervalSince(Date()) / 60); if m > 0 && m <= 45 { return WidgetSuggestion(message: "\(e.title) in \(m) min.", deepLink: "ira://calendar") } }
        if let s = c.steps, s < 4000 { return WidgetSuggestion(message: "A short walk could help.", deepLink: "x-apple-health://") }
        return nil
    }

    static func buildActions(_ c: Fetcher.Ctx) -> [WidgetAction] {
        var a: [WidgetAction] = []
        if c.event != nil { a.append(WidgetAction(label: "Calendar", deepLink: "calshow:")) }
        if let s = c.steps, s < 5000 { a.append(WidgetAction(label: "Walk", deepLink: "x-apple-health://")) }
        if a.isEmpty { a.append(WidgetAction(label: "Open Ira", deepLink: "ira://home")) }
        return a
    }

    static func daypart(_ d: Date) -> String { let h = Calendar.current.component(.hour, from: d); return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening" }
    static func timeStr(_ d: Date) -> String { let f = DateFormatter(); f.dateFormat = "h:mm a"; return f.string(from: d) }
}

// MARK: - Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> IraWidgetEntry { IraWidgetEntry(date: .now, payload: fallback(.now)) }

    func getSnapshot(in context: Context, completion: @escaping (IraWidgetEntry) -> Void) {
        if context.isPreview { completion(IraWidgetEntry(date: .now, payload: loadPayload() ?? fallback(.now))); return }
        Fetcher.fetch { c in let p = Builder.build(from: c, at: .now); completion(IraWidgetEntry(date: .now, payload: p)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<IraWidgetEntry>) -> Void) {
        let now = Date()
        Fetcher.fetch { c in
            let has = c.event != nil || c.steps != nil || c.playing
            let p = has ? Builder.build(from: c, at: now) : (loadPayload() ?? fallback(now))
            completion(Timeline(entries: [IraWidgetEntry(date: now, payload: p)], policy: .after(now.addingTimeInterval(900))))
        }
    }

    func loadPayload() -> SharedWidgetPayload? {
        guard let d = UserDefaults(suiteName: appGroup), let s = d.string(forKey: payloadKey), let data = s.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(SharedWidgetPayload.self, from: data)
    }

    func fallback(_ d: Date) -> SharedWidgetPayload {
        let s = WidgetState(status: "empty", unreadCount: 0, topMessagePreview: "Open Ira to get started.", quickActions: [WidgetAction(label: "Open Ira", deepLink: "ira://home")], topSuggestion: nil, lastUpdatedAt: Builder.timeStr(d))
        return SharedWidgetPayload(variantData: WidgetVariantData(small: s, medium: s, large: s, lock: s), generatedAt: ISO8601DateFormatter().string(from: d))
    }
}

// MARK: - Views

struct irawidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall: smallView(entry.payload.variantData.small)
        case .systemMedium: mediumView(entry.payload.variantData.medium)
        case .systemLarge: largeView(entry.payload.variantData.large)
        case .accessoryRectangular: lockView(entry.payload.variantData.lock)
        default: smallView(entry.payload.variantData.small)
        }
    }

    func smallView(_ s: WidgetState) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            header; unreadBadge(s)
            if let sugg = s.topSuggestion { Text(sugg.message).font(.caption).lineLimit(3) }
            else { Text(s.topMessagePreview ?? "Quiet").font(.caption).foregroundStyle(.secondary).lineLimit(3) }
            Spacer(minLength: 0)
            Text("Updated \(s.lastUpdatedAt)").font(.caption2).foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(bg, for: .widget)
        .widgetURL(URL(string: s.topSuggestion?.deepLink ?? "ira://home"))
    }

    func mediumView(_ s: WidgetState) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { header; Spacer(); unreadBadge(s) }
            if let sugg = s.topSuggestion { Text(sugg.message).font(.subheadline.weight(.medium)).lineLimit(3) }
            else { Text(s.topMessagePreview ?? "Quiet").font(.subheadline).foregroundStyle(.secondary).lineLimit(3) }
            Spacer(minLength: 0)
            if !s.quickActions.isEmpty { actionRow(s.quickActions, max: 2) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(bg, for: .widget)
        .widgetURL(URL(string: "ira://home"))
    }

    func largeView(_ s: WidgetState) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { header; Spacer(); unreadBadge(s) }
            Text(entry.date, style: .time).font(.system(size: 36, weight: .bold, design: .rounded)).monospacedDigit()
            if let sugg = s.topSuggestion {
                Text(sugg.message).font(.body.weight(.semibold)).lineLimit(4)
            }
            Text(s.topMessagePreview ?? "Quiet").font(.subheadline).foregroundStyle(.secondary).lineLimit(3)
            Spacer(minLength: 0)
            if !s.quickActions.isEmpty { actionRow(s.quickActions, max: 3) }
            Text("Updated \(s.lastUpdatedAt)").font(.caption2).foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(bg, for: .widget)
        .widgetURL(URL(string: "ira://home"))
    }

    func lockView(_ s: WidgetState) -> some View {
        HStack(spacing: 8) {
            Circle().fill(s.status == "ready" ? Color.green : Color.gray).frame(width: 8, height: 8)
            VStack(alignment: .leading, spacing: 2) {
                Text((s.unreadCount ?? 0) > 0 ? "\(s.unreadCount!) unread" : "Quiet").font(.headline)
                Text(s.topSuggestion?.message ?? s.topMessagePreview ?? "Open Ira").font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .widgetURL(URL(string: "ira://home"))
    }

    var header: some View { Text("Ira").font(.caption.weight(.semibold)).foregroundStyle(.secondary) }
    var bg: some ShapeStyle { LinearGradient(colors: [Color(red: 0.05, green: 0.07, blue: 0.11), Color(red: 0.08, green: 0.11, blue: 0.17)], startPoint: .topLeading, endPoint: .bottomTrailing) }

    @ViewBuilder func unreadBadge(_ s: WidgetState) -> some View {
        if s.status == "ready", let c = s.unreadCount, c > 0 {
            Text("\(c) unread").font(.caption2.weight(.bold)).foregroundStyle(Color(red: 0.22, green: 0.76, blue: 0.6))
        }
    }

    func actionRow(_ actions: [WidgetAction], max: Int) -> some View {
        HStack(spacing: 8) {
            ForEach(actions.prefix(max), id: \.deepLink) { a in
                if let url = URL(string: a.deepLink) {
                    Link(destination: url) { Text(a.label).font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 6).background(Color.white.opacity(0.07), in: Capsule()) }
                }
            }
        }
    }
}

// MARK: - Widget

struct irawidget: Widget {
    let kind = "irawidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in irawidgetEntryView(entry: entry) }
            .configurationDisplayName("Ira")
            .description("Suggestions, quick actions, and context at a glance.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    }
}
