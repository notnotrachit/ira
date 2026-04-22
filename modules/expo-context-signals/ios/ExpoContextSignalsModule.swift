import ExpoModulesCore
import EventKit
import Contacts
import HealthKit
import MediaPlayer
import WidgetKit

public class ExpoContextSignalsModule: Module {
  private static let appGroup = "group.com.ira.app.shared"
  private static let widgetPayloadKey = "ira_widget_payload"
  private static let healthStateKey = "ira_health_permission_state"

  public func definition() -> ModuleDefinition {
    Name("ExpoContextSignals")

    AsyncFunction("getContextSnapshot") { () -> [String: Any?] in
      await self.buildSnapshot()
    }

    AsyncFunction("syncWidgetPayload") { (payload: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: Self.appGroup) else { return false }
      defaults.set(payload, forKey: Self.widgetPayloadKey)
      defaults.synchronize()
      if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
      return true
    }

    AsyncFunction("requestPermission") { (source: String) -> String in
      await self.requestPermission(source: source)
    }

    Function("markPermissionRequested") { (permission: String) in
      UserDefaults.standard.set(true, forKey: "perm_requested_\(permission)")
    }
  }

  // MARK: - Snapshot

  private func buildSnapshot() async -> [String: Any?] {
    let events = Self.calendarEvents()
    let contacts = Self.contacts()
    let music = Self.musicSummary()
    let health = await Self.healthSummary()
    return [
      "generatedAt": Self.isoString(from: Date()),
      "permissions": Self.permissionMap(),
      "calendarEvents": events,
      "health": health,
      "frequentContacts": contacts,
      "installedApps": [] as [[String: Any?]],
      "music": music,
      "usagePatterns": [] as [[String: Any?]],
      "messagesSummary": Self.messagesSummary(events: events, contacts: contacts, music: music),
    ]
  }

  // MARK: - Permissions

  private static func permissionMap() -> [String: String] {
    [
      "calendar": calendarPermState(),
      "contacts": contactsPermState(),
      "health": healthPermState(),
      "music": musicPermState(),
      "installed_apps": "unavailable",
      "app_usage": "unavailable",
      "messages_summary": "unavailable",
    ]
  }

  private static func calendarPermState() -> String {
    let status = EKEventStore.authorizationStatus(for: .event)
    if status == .authorized { return "granted" }
    if #available(iOS 17.0, *), status == .fullAccess { return "granted" }
    if #available(iOS 17.0, *), status == .writeOnly { return "blocked" }
    if status == .denied || status == .restricted { return "denied" }
    return "not_determined"
  }

  private static func contactsPermState() -> String {
    let status = CNContactStore.authorizationStatus(for: .contacts)
    if status == .authorized { return "granted" }
    if #available(iOS 18.0, *), status == .limited { return "granted" }
    if status == .denied || status == .restricted { return "denied" }
    return "not_determined"
  }

  private static func healthPermState() -> String {
    #if targetEnvironment(simulator)
    return "unavailable"
    #else
    if !HKHealthStore.isHealthDataAvailable() { return "unavailable" }
    return UserDefaults.standard.string(forKey: healthStateKey) ?? "not_determined"
    #endif
  }

  private static func musicPermState() -> String {
    switch MPMediaLibrary.authorizationStatus() {
    case .authorized: return "granted"
    case .denied: return "denied"
    case .restricted: return "blocked"
    default: return "not_determined"
    }
  }

  // MARK: - Request permission

  private func requestPermission(source: String) async -> String {
    switch source {
    case "calendar": return await requestCalendar()
    case "contacts": return await requestContacts()
    case "health": return await requestHealth()
    case "music": return await requestMusic()
    default: return "unavailable"
    }
  }

  private func requestCalendar() async -> String {
    let store = EKEventStore()
    do {
      if #available(iOS 17.0, *) {
        let granted = try await store.requestFullAccessToEvents()
        return granted ? "granted" : "denied"
      } else {
        return await withCheckedContinuation { cont in
          store.requestAccess(to: .event) { granted, _ in cont.resume(returning: granted ? "granted" : "denied") }
        }
      }
    } catch { return "denied" }
  }

  private func requestContacts() async -> String {
    await withCheckedContinuation { cont in
      CNContactStore().requestAccess(for: .contacts) { granted, _ in cont.resume(returning: granted ? "granted" : "denied") }
    }
  }

  private func requestHealth() async -> String {
    #if targetEnvironment(simulator)
    return "unavailable"
    #else
    guard HKHealthStore.isHealthDataAvailable() else { return "unavailable" }
    let store = HKHealthStore()
    let types: Set<HKObjectType> = [
      HKObjectType.quantityType(forIdentifier: .stepCount)!,
      HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
    ]
    do {
      try await store.requestAuthorization(toShare: [], read: types)
      UserDefaults.standard.set("granted", forKey: Self.healthStateKey)
      return "granted"
    } catch {
      UserDefaults.standard.set("denied", forKey: Self.healthStateKey)
      return "denied"
    }
    #endif
  }

  private func requestMusic() async -> String {
    await withCheckedContinuation { cont in
      MPMediaLibrary.requestAuthorization { status in
        switch status {
        case .authorized: cont.resume(returning: "granted")
        case .denied: cont.resume(returning: "denied")
        case .restricted: cont.resume(returning: "blocked")
        default: cont.resume(returning: "not_determined")
        }
      }
    }
  }

  // MARK: - Data readers

  private static func calendarEvents() -> [[String: Any?]] {
    let status = EKEventStore.authorizationStatus(for: .event)
    var hasAccess = status == .authorized
    if #available(iOS 17.0, *) { hasAccess = hasAccess || status == .fullAccess }
    guard hasAccess else { return [] }

    let store = EKEventStore()
    let now = Date()
    let end = now.addingTimeInterval(86400)
    let events = store.events(matching: store.predicateForEvents(withStart: now, end: end, calendars: nil))
      .sorted { $0.startDate < $1.startDate }
      .prefix(3)

    return events.map { e in
      ["id": e.eventIdentifier ?? UUID().uuidString, "title": e.title ?? "Untitled event",
       "startTime": isoString(from: e.startDate), "endTime": isoString(from: e.endDate),
       "location": e.location as Any?]
    }
  }

  private static func contacts() -> [[String: Any?]] {
    let status = CNContactStore.authorizationStatus(for: .contacts)
    var hasAccess = status == .authorized
    if #available(iOS 18.0, *) { hasAccess = hasAccess || status == .limited }
    guard hasAccess else { return [] }

    let store = CNContactStore()
    let keys: [CNKeyDescriptor] = [CNContactIdentifierKey as CNKeyDescriptor, CNContactGivenNameKey as CNKeyDescriptor, CNContactFamilyNameKey as CNKeyDescriptor]
    var results: [[String: Any?]] = []
    let request = CNContactFetchRequest(keysToFetch: keys)
    try? store.enumerateContacts(with: request) { contact, stop in
      let name = [contact.givenName, contact.familyName].filter { !$0.isEmpty }.joined(separator: " ")
      guard !name.isEmpty else { return }
      results.append(["id": contact.identifier, "displayName": name, "interactionScore": 0.7])
      if results.count >= 5 { stop.pointee = true }
    }
    return results
  }

  private static func musicSummary() -> [String: Any?] {
    guard musicPermState() == "granted" else { return ["track": nil, "artist": nil, "appPackage": nil, "isPlaying": nil] }
    let player = MPMusicPlayerController.systemMusicPlayer
    let item = player.nowPlayingItem
    return [
      "track": item?.title as Any?,
      "artist": item?.artist as Any?,
      "appPackage": nil as Any?,
      "isPlaying": item != nil ? (player.playbackState == .playing) : nil as Any?,
    ]
  }

  private static func healthSummary() async -> [String: Any?] {
    #if targetEnvironment(simulator)
    return ["stepsToday": nil, "sleepHoursLastNight": nil, "avgDailyStepsLastWeek": nil]
    #else
    guard HKHealthStore.isHealthDataAvailable(), healthPermState() == "granted" else {
      return ["stepsToday": nil, "sleepHoursLastNight": nil, "avgDailyStepsLastWeek": nil]
    }
    let store = HKHealthStore()
    let cal = Calendar.current
    let now = Date()
    let startOfDay = cal.startOfDay(for: now)
    let weekStart = cal.date(byAdding: .day, value: -6, to: startOfDay)!
    let sleepStart = cal.date(byAdding: .hour, value: -30, to: startOfDay)!

    async let steps = querySteps(store: store, start: startOfDay, end: now)
    async let weeklySteps = querySteps(store: store, start: weekStart, end: now)
    async let sleep = querySleep(store: store, start: sleepStart, end: now)

    let s = await steps
    let ws = await weeklySteps
    let sl = await sleep
    return [
      "stepsToday": s,
      "sleepHoursLastNight": sl,
      "avgDailyStepsLastWeek": ws.map { $0 / 7.0 },
    ]
    #endif
  }

  private static func querySteps(store: HKHealthStore, start: Date, end: Date) async -> Double? {
    guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return nil }
    return await withCheckedContinuation { cont in
      let pred = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      let q = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: pred, options: .cumulativeSum) { _, result, _ in
        cont.resume(returning: result?.sumQuantity()?.doubleValue(for: .count()))
      }
      store.execute(q)
    }
  }

  private static func querySleep(store: HKHealthStore, start: Date, end: Date) async -> Double? {
    guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return nil }
    return await withCheckedContinuation { cont in
      let pred = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      let q = HKSampleQuery(sampleType: sleepType, predicate: pred, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, _ in
        let total = (results as? [HKCategorySample])?.reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) } ?? 0
        cont.resume(returning: total > 0 ? total / 3600.0 : nil)
      }
      store.execute(q)
    }
  }

  private static func messagesSummary(events: [[String: Any?]], contacts: [[String: Any?]], music: [String: Any?]) -> [String: Any?] {
    var preview: String? = nil
    if let event = events.first, let title = event["title"] as? String {
      let loc = event["location"] as? String
      preview = loc != nil && !loc!.isEmpty ? "Next up: \(title) · \(loc!)" : "Next up: \(title)"
    }
    if preview == nil, let track = music["track"] as? String {
      let artist = music["artist"] as? String
      preview = artist != nil ? "Now playing \(track) — \(artist!)" : "Now playing \(track)"
    }
    if preview == nil, let contact = contacts.first, let name = contact["displayName"] as? String {
      preview = "Good moment to check in with \(name)."
    }
    return ["unreadCount": 0, "preview": preview ?? "Open Ira to sync your latest context."]
  }

  private static func isoString(from date: Date) -> String {
    ISO8601DateFormatter().string(from: date)
  }
}
