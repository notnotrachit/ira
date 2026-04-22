package expo.modules.contextsignals

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class IraWidgetProvider : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == "com.ira.app.WIDGET_PAYLOAD_UPDATED") refresh(context)
    if (intent.action == ACTION_REPLY) {
      val pkg = intent.getStringExtra("pkg")
      if (pkg != null) {
        val launch = context.packageManager.getLaunchIntentForPackage(pkg)
        if (launch != null) { launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); runCatching { context.startActivity(launch) } }
      }
    }
  }

  override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) = refresh(context, mgr, ids)

  companion object {
    private const val PREFS = "ira_widget_payload"
    private const val KEY = "payload_json"
    private const val ACTION_REPLY = "expo.modules.contextsignals.ACTION_REPLY"

    fun refresh(context: Context, mgr: AppWidgetManager? = null, ids: IntArray? = null) {
      val m = mgr ?: AppWidgetManager.getInstance(context)
      val i = ids ?: m.getAppWidgetIds(ComponentName(context, IraWidgetProvider::class.java))
      i.forEach { update(context, m, it) }
    }

    private fun update(ctx: Context, mgr: AppWidgetManager, id: Int) {
      val payload = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
      val opts = mgr.getAppWidgetOptions(id)
      val w = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
      val size = if (w >= 250) "large" else if (w >= 180) "medium" else "small"
      val v = payload?.optJSONObject("variantData")?.optJSONObject(size)

      val status = v?.optString("status") ?: "empty"
      val unread = v?.optInt("unreadCount", 0) ?: 0
      val preview = v?.optString("topMessagePreview") ?: "Open Ira to sync."
      val suggestion = v?.optJSONObject("topSuggestion")
      val suggMsg = suggestion?.optString("message") ?: ""
      val actions = v?.optJSONArray("quickActions")
      val hasSugg = suggestion != null && (suggestion.optDouble("relevanceScore", 0.0) >= 0.52)
      val hasActions = actions != null && actions.length() > 0

      val views = RemoteViews(ctx.packageName, ctx.resources.getIdentifier("ira_widget", "layout", ctx.packageName))

      views.setTextViewText(rid(ctx, "widget_kicker"), kicker(status).uppercase())
      views.setTextViewText(rid(ctx, "widget_unread_badge"), "$unread unread")
      views.setTextViewText(rid(ctx, "widget_preview"), preview)
      views.setTextViewText(rid(ctx, "widget_suggestion"), suggMsg)

      views.setViewVisibility(rid(ctx, "widget_unread_badge"), if (unread > 0) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_clock_large"), if (!hasSugg && !hasActions) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_clock_compact"), if (hasSugg || hasActions) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_preview"), if (!hasSugg) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_suggestion"), if (hasSugg) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_actions_row"), if (hasActions) View.VISIBLE else View.GONE)
      views.setViewVisibility(rid(ctx, "widget_action_secondary"), if ((actions?.length() ?: 0) > 1) View.VISIBLE else View.GONE)

      bind(ctx, views, rid(ctx, "widget_root"), "ira://home", 100 + id)

      val a1 = actions?.optJSONObject(0)
      val a2 = actions?.optJSONObject(1)
      views.setTextViewText(rid(ctx, "widget_action_primary"), a1?.optString("label") ?: "Open")
      views.setTextViewText(rid(ctx, "widget_action_secondary"), a2?.optString("label") ?: "")
      bind(ctx, views, rid(ctx, "widget_action_primary"), a1?.optString("deepLink") ?: "ira://home", 200 + id)
      if (a2 != null) bind(ctx, views, rid(ctx, "widget_action_secondary"), a2.optString("deepLink") ?: "ira://home", 300 + id)

      mgr.updateAppWidget(id, views)
    }

    private fun bind(ctx: Context, views: RemoteViews, viewId: Int, deepLink: String, rc: Int) {
      if (deepLink.startsWith("ira-widget://reply-external")) {
        val pkg = Uri.parse(deepLink).getQueryParameter("package")
        val i = Intent(ctx, IraWidgetProvider::class.java).apply { action = ACTION_REPLY; putExtra("pkg", pkg) }
        views.setOnClickPendingIntent(viewId, PendingIntent.getBroadcast(ctx, rc, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        return
      }
      val intent = if (deepLink == "ira-widget://health-external") {
        val fit = ctx.packageManager.getLaunchIntentForPackage("com.google.android.apps.fitness")
        fit?.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) } ?: Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.fitness")).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
      } else {
        Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); if (deepLink.startsWith("ira://")) setPackage(ctx.packageName) }
      }
      views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(ctx, rc, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }

    private fun rid(ctx: Context, name: String) = ctx.resources.getIdentifier(name, "id", ctx.packageName)
    private fun kicker(status: String) = when (status) { "stale" -> "Catch up"; "denied" -> "Action needed"; else -> "At a glance" }
  }
}
