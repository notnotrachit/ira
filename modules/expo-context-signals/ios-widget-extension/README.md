# iOS Widget Extension Setup

After `npx expo prebuild`, add the widget target in Xcode:

1. Open `ios/ira.xcworkspace`
2. File → New → Target → Widget Extension → name: `irawidget`
3. Copy files from this directory into the target
4. Set App Group to `group.com.ira.app.shared` in Signing & Capabilities
5. Build and run
