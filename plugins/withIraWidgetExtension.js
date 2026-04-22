const { withXcodeProject, withEntitlementsPlist, withInfoPlist, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'irawidget';
const APP_GROUP = 'group.com.ira.app.shared';
const WIDGET_SRC = path.resolve(__dirname, '../modules/expo-context-signals/ios-widget-extension');

function withIraWidgetExtension(config) {
  // Add app group to main app entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    config.modResults['com.apple.developer.healthkit'] = true;
    return config;
  });

  // Add iOS permission descriptions
  config = withInfoPlist(config, (config) => {
    config.modResults.NSCalendarsUsageDescription = config.modResults.NSCalendarsUsageDescription || 'Ira reads your calendar to surface upcoming meetings.';
    config.modResults.NSCalendarsFullAccessUsageDescription = config.modResults.NSCalendarsFullAccessUsageDescription || 'Ira reads your calendar to surface upcoming meetings.';
    config.modResults.NSContactsUsageDescription = config.modResults.NSContactsUsageDescription || 'Ira reads contacts for relationship context.';
    config.modResults.NSHealthShareUsageDescription = config.modResults.NSHealthShareUsageDescription || 'Ira reads steps and sleep for wellness nudges.';
    config.modResults.NSAppleMusicUsageDescription = config.modResults.NSAppleMusicUsageDescription || 'Ira detects now-playing music for focus suggestions.';
    return config;
  });

  // Add widget extension target to Xcode project
  config = withXcodeProject(config, (config) => {
    const proj = config.modResults;
    const targetName = WIDGET_NAME;
    const bundleId = `${config.ios?.bundleIdentifier}.${targetName}`;

    // Check if target already exists
    const existingTarget = proj.pbxTargetByName(targetName);
    if (existingTarget) return config;

    // Copy widget source files to ios/irawidget/
    const iosDir = config.modRequest.platformProjectRoot;
    const widgetDir = path.join(iosDir, targetName);
    if (!fs.existsSync(widgetDir)) fs.mkdirSync(widgetDir, { recursive: true });

    const srcFiles = ['irawidget.swift', 'irawidgetBundle.swift'];
    for (const file of srcFiles) {
      const src = path.join(WIDGET_SRC, file);
      const dst = path.join(widgetDir, file);
      if (fs.existsSync(src)) fs.writeFileSync(dst, fs.readFileSync(src, 'utf8'));
    }

    // Write entitlements
    const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array><string>${APP_GROUP}</string></array>
  <key>com.apple.developer.healthkit</key>
  <true/>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, `${targetName}.entitlements`), entitlements);

    // Write Info.plist for extension
    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), infoPlist);

    // Assets
    const assetsDir = path.join(widgetDir, 'Assets.xcassets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'Contents.json'), '{"info":{"version":1,"author":"xcode"}}');
    }

    // Add extension target
    const target = proj.addTarget(targetName, 'app_extension', targetName, bundleId);

    // Add source files to target
    const groupKey = proj.pbxCreateGroup(targetName, targetName);
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(groupKey, mainGroupId);

    for (const file of [...srcFiles, `${targetName}.entitlements`, 'Info.plist']) {
      const filePath = `${targetName}/${file}`;
      if (file.endsWith('.swift')) {
        proj.addSourceFile(filePath, { target: target.uuid }, groupKey);
      } else {
        proj.addFile(filePath, groupKey);
      }
    }

    // Set build settings
    const configs = proj.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const cfg = configs[key];
      if (cfg.buildSettings && cfg.baseConfigurationReference === undefined) continue;
      if (typeof cfg === 'string') continue;
      if (!cfg.buildSettings) continue;

      const name = cfg.buildSettings.PRODUCT_NAME || cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
      if (name && (name === `"${targetName}"` || name === targetName || (typeof name === 'string' && name.includes(targetName)))) {
        cfg.buildSettings.SWIFT_VERSION = '5.0';
        cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
        cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
        cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
        cfg.buildSettings.INFOPLIST_FILE = `${targetName}/Info.plist`;
        cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        cfg.buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor';
        cfg.buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground';
        cfg.buildSettings.GENERATE_INFOPLIST_FILE = 'YES';
      }
    }

    return config;
  });

  return config;
}

module.exports = withIraWidgetExtension;
