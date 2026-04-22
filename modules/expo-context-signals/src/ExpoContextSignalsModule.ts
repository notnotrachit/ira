import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoContextSignalsModule extends NativeModule {
  getContextSnapshot(): Promise<Record<string, any>>;
  syncWidgetPayload(payload: string): Promise<boolean>;
  requestPermission(source: string): Promise<string>;
  markPermissionRequested(permission: string): void;
}

export default requireNativeModule<ExpoContextSignalsModule>('ExpoContextSignals');
