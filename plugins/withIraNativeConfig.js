const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

function withIraNativeConfig(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Health Connect query
    manifest.queries = manifest.queries || [{}];
    manifest.queries[0].intent = manifest.queries[0].intent || [];
    manifest.queries[0].intent.push({
      action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }],
    });

    // Health Connect permission rationale activity alias
    const app = manifest.application[0];
    app['activity-alias'] = app['activity-alias'] || [];
    app['activity-alias'].push({
      $: {
        'android:name': 'ViewPermissionUsageActivity',
        'android:exported': 'true',
        'android:targetActivity': '.MainActivity',
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
        category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
      }],
    });

    return config;
  });

  return config;
}

module.exports = withIraNativeConfig;
