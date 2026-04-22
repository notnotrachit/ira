package expo.modules.contextsignals

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

class IraNotificationListenerService : NotificationListenerService() {

  companion object {
    private const val PREFS_NAME = "ira_signal_state"
    private const val KEY = "message_notifications"
    private const val MAX = 12

    fun loadNotifications(context: Context): JSONArray {
      val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY, null) ?: return JSONArray()
      return runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
    }

    private fun save(context: Context, entries: JSONArray) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putString(KEY, entries.toString()).apply()
    }

    private fun buildEntry(sbn: StatusBarNotification): JSONObject? {
      val extras = sbn.notification.extras
      val title = (extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE) ?: extras.getCharSequence(Notification.EXTRA_TITLE) ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG))?.toString()?.trim()
      val text = (extras.getCharSequence(Notification.EXTRA_TEXT) ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT))?.toString()?.trim()
      if (title.isNullOrEmpty() && text.isNullOrEmpty()) return null
      val cat = sbn.notification.category
      if (cat != Notification.CATEGORY_MESSAGE && cat != Notification.CATEGORY_SOCIAL && cat != Notification.CATEGORY_EMAIL) return null
      if (sbn.isOngoing) return null
      return JSONObject().apply {
        put("key", sbn.key); put("packageName", sbn.packageName)
        put("title", title); put("text", text); put("category", cat); put("postedAt", sbn.postTime)
      }
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) return
    val entry = buildEntry(sbn) ?: return
    val current = loadNotifications(this)
    val filtered = JSONArray().apply {
      put(entry); var n = 1
      for (i in 0 until current.length()) {
        val item = current.optJSONObject(i) ?: continue
        if (item.optString("key") == sbn.key || n >= MAX) continue
        put(item); n++
      }
    }
    save(this, filtered)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    val current = loadNotifications(this)
    val filtered = JSONArray().apply {
      for (i in 0 until current.length()) {
        val item = current.optJSONObject(i) ?: continue
        if (item.optString("key") != sbn.key) put(item)
      }
    }
    save(this, filtered)
  }
}
