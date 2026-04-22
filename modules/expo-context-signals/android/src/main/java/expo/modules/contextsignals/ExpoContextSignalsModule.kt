package expo.modules.contextsignals

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaMetadata
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Build
import android.provider.CalendarContract
import android.provider.ContactsContract
import android.provider.Settings
import androidx.core.app.ActivityCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

class ExpoContextSignalsModule : Module() {
  companion object {
    private const val WIDGET_PREFS = "ira_widget_payload"
    private const val WIDGET_PAYLOAD_KEY = "payload_json"
    private const val SIGNAL_PREFS = "ira_signal_state"
    private const val NOTIF_LISTENER_CLASS = "expo.modules.contextsignals.IraNotificationListenerService"
  }

  private val ctx: Context get() = appContext.reactContext ?: throw IllegalStateException("No context")

  override fun definition() = ModuleDefinition {
    Name("ExpoContextSignals")

    AsyncFunction("getContextSnapshot") { buildSnapshot() }

    AsyncFunction("syncWidgetPayload") { payload: String ->
      ctx.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        .edit().putString(WIDGET_PAYLOAD_KEY, payload).apply()
      // Widget refresh is triggered via broadcast — the app's WidgetProvider handles it
      val intent = Intent("com.ira.app.WIDGET_PAYLOAD_UPDATED")
      intent.setPackage(ctx.packageName)
      ctx.sendBroadcast(intent)
      true
    }

    AsyncFunction("requestPermission") { source: String -> requestPerm(source) }

    Function("markPermissionRequested") { permission: String ->
      ctx.getSharedPreferences(SIGNAL_PREFS, Context.MODE_PRIVATE)
        .edit().putBoolean("perm_requested_$permission", true).apply()
    }
  }

  private fun buildSnapshot(): Map<String, Any?> = mapOf(
    "generatedAt" to Instant.now().toString(),
    "permissions" to buildPerms(),
    "calendarEvents" to readCalendar(),
    "health" to readHealth(),
    "frequentContacts" to readContacts(),
    "installedApps" to readApps(),
    "music" to readMusic(),
    "usagePatterns" to readUsage(),
    "messagesSummary" to readMessages(),
  )

  // --- Permissions ---

  private fun buildPerms(): Map<String, String> = mapOf(
    "calendar" to rtPerm(android.Manifest.permission.READ_CALENDAR),
    "contacts" to rtPerm(android.Manifest.permission.READ_CONTACTS),
    "health" to healthPerm(),
    "music" to notifPerm(),
    "installed_apps" to "granted",
    "app_usage" to usagePerm(),
    "messages_summary" to notifPerm(),
  )

  private fun rtPerm(perm: String): String {
    if (ctx.checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED) return "granted"
    val activity = appContext.currentActivity
    val requested = ctx.getSharedPreferences(SIGNAL_PREFS, Context.MODE_PRIVATE).getBoolean("perm_requested_$perm", false)
    val rationale = activity != null && ActivityCompat.shouldShowRequestPermissionRationale(activity, perm)
    return if (requested && !rationale) "denied" else "not_determined"
  }

  private fun usagePerm(): String {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.packageName)
    else @Suppress("DEPRECATION") ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.packageName)
    return if (mode == AppOpsManager.MODE_ALLOWED) "granted" else "denied"
  }

  private fun notifPerm(): String {
    val listeners = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: ""
    return if (listeners.contains(ctx.packageName)) "granted" else "not_determined"
  }

  private fun healthPerm(): String = "not_determined"

  // --- Request ---

  private fun requestPerm(source: String): String {
    when (source) {
      "music", "messages_summary" -> {
        ctx.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "not_determined"
      }
      "app_usage" -> {
        ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "not_determined"
      }
      "health" -> return "unavailable" // Handled from JS via react-native-health-connect
      else -> return "unavailable"
    }
  }

  // --- Data readers ---

  private fun readCalendar(): List<Map<String, Any?>> {
    if (rtPerm(android.Manifest.permission.READ_CALENDAR) != "granted") return emptyList()
    val now = System.currentTimeMillis()
    val uri = CalendarContract.Instances.CONTENT_URI.buildUpon().also { ContentUris.appendId(it, now); ContentUris.appendId(it, now + 86400000L) }.build()
    val results = mutableListOf<Map<String, Any?>>()
    ctx.contentResolver.query(uri, arrayOf(CalendarContract.Instances.EVENT_ID, CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Instances.EVENT_LOCATION), null, null, "${CalendarContract.Instances.BEGIN} ASC")?.use { c ->
      var n = 0; while (c.moveToNext() && n < 3) {
        results.add(mapOf("id" to c.getString(0), "title" to (c.getString(1) ?: "Untitled"), "startTime" to Instant.ofEpochMilli(c.getLong(2)).toString(), "endTime" to Instant.ofEpochMilli(c.getLong(3)).toString(), "location" to c.getString(4))); n++
      }
    }
    return results
  }

  private fun readHealth(): Map<String, Any?> = mapOf("stepsToday" to null, "sleepHoursLastNight" to null, "avgDailyStepsLastWeek" to null) // Handled from JS

  private fun readContacts(): List<Map<String, Any?>> {
    if (rtPerm(android.Manifest.permission.READ_CONTACTS) != "granted") return emptyList()
    val results = mutableListOf<Map<String, Any?>>()
    ctx.contentResolver.query(ContactsContract.Contacts.CONTENT_URI, arrayOf(ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY, ContactsContract.Contacts.STARRED), "${ContactsContract.Contacts.HAS_PHONE_NUMBER} > 0", null, "${ContactsContract.Contacts.STARRED} DESC, ${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} ASC")?.use { c ->
      var n = 0; while (c.moveToNext() && n < 5) { val name = c.getString(1) ?: continue; results.add(mapOf("id" to c.getString(0), "displayName" to name, "interactionScore" to if (c.getInt(2) == 1) 0.9 else 0.65)); n++ }
    }
    return results
  }

  private fun readApps(): List<Map<String, Any?>> {
    val pm = ctx.packageManager
    return pm.getInstalledApplications(PackageManager.GET_META_DATA)
      .filter { pm.getLaunchIntentForPackage(it.packageName) != null && it.packageName != ctx.packageName }
      .sortedBy { pm.getApplicationLabel(it).toString().lowercase() }
      .take(15)
      .map { mapOf("packageOrBundleId" to it.packageName, "name" to pm.getApplicationLabel(it).toString(), "category" to catName(it.category), "usageScore" to 0.5) }
  }

  private fun readMusic(): Map<String, Any?> {
    if (notifPerm() != "granted") return mapOf("track" to null, "artist" to null, "appPackage" to null, "isPlaying" to null)
    val sm = ctx.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
    val cn = ComponentName(ctx, Class.forName(NOTIF_LISTENER_CLASS))
    val ctrl = runCatching { sm.getActiveSessions(cn).firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING } ?: sm.getActiveSessions(cn).firstOrNull() }.getOrNull()
    return mapOf("track" to ctrl?.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE), "artist" to ctrl?.metadata?.getString(MediaMetadata.METADATA_KEY_ARTIST), "appPackage" to ctrl?.packageName, "isPlaying" to ctrl?.playbackState?.let { it.state == PlaybackState.STATE_PLAYING })
  }

  private fun readUsage(): List<Map<String, Any?>> {
    if (usagePerm() != "granted") return emptyList()
    val um = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    return um.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, end - 86400000L, end).filter { it.totalTimeInForeground > 0 }.sortedByDescending { it.totalTimeInForeground }.take(5).map { mapOf("appId" to it.packageName, "minutesToday" to (it.totalTimeInForeground / 60000L).toInt(), "lastUsedAt" to Instant.ofEpochMilli(it.lastTimeUsed).toString()) }
  }

  private fun readMessages(): Map<String, Any?> {
    if (notifPerm() != "granted") return mapOf("unreadCount" to 0, "preview" to null, "sourceAppPackage" to null)
    val now = System.currentTimeMillis()
    val entries = IraNotificationListenerService.loadNotifications(ctx)
    var count = 0; var preview: String? = null; var pkg: String? = null
    for (i in 0 until entries.length()) {
      val item = entries.optJSONObject(i) ?: continue
      val posted = item.optLong("postedAt")
      if (posted <= 0L || now - posted > 18 * 3600000L) continue
      count++
      if (preview == null) {
        val t = item.optString("title").takeIf { it.isNotBlank() }
        val x = item.optString("text").takeIf { it.isNotBlank() }
        preview = listOfNotNull(t, x).joinToString(": ").takeIf { it.isNotBlank() }
        pkg = item.optString("packageName").takeIf { it.isNotBlank() }
      }
    }
    return mapOf("unreadCount" to count, "preview" to preview, "sourceAppPackage" to pkg)
  }

  // --- Helpers ---

  private fun catName(cat: Int): String? = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) null else when (cat) {
    android.content.pm.ApplicationInfo.CATEGORY_AUDIO -> "audio"; android.content.pm.ApplicationInfo.CATEGORY_GAME -> "game"
    android.content.pm.ApplicationInfo.CATEGORY_IMAGE -> "image"; android.content.pm.ApplicationInfo.CATEGORY_MAPS -> "maps"
    android.content.pm.ApplicationInfo.CATEGORY_NEWS -> "news"; android.content.pm.ApplicationInfo.CATEGORY_PRODUCTIVITY -> "productivity"
    android.content.pm.ApplicationInfo.CATEGORY_SOCIAL -> "social"; android.content.pm.ApplicationInfo.CATEGORY_VIDEO -> "video"
    else -> null
  }
}
