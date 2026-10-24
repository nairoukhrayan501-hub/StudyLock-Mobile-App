import { Platform } from 'react-native';

export interface AppBlockingStatus {
  supported: boolean;
  platform: string;
  explanation: string;
}

export interface AppRestrictionAdapter {
  getStatus(): AppBlockingStatus;
  selectApps(): Promise<string[]>;
  activate(appIds: string[]): Promise<void>;
  deactivate(): Promise<void>;
}

class UnavailableAppRestrictionAdapter implements AppRestrictionAdapter {
  getStatus(): AppBlockingStatus {
    const platform = Platform.OS;
    return {
      supported: false,
      platform,
      explanation:
        platform === 'ios'
          ? 'iOS app blocking requires Apple Family Controls entitlement approval and native FamilyControls, ManagedSettings, and DeviceActivity extensions. This Expo Go build does not have those entitlements.'
          : platform === 'android'
            ? 'Android app blocking needs an explicit native module and user-granted system access. Usage access by itself does not block apps, and this build does not claim to do so.'
            : 'App blocking is a native mobile capability and is not available in this preview.',
    };
  }

  async selectApps(): Promise<string[]> {
    throw new Error('App selection is unavailable until a native app-restriction adapter is installed.');
  }

  async activate(_appIds: string[]): Promise<void> {
    throw new Error('App restrictions are unavailable until a native app-restriction adapter is installed.');
  }

  async deactivate(): Promise<void> {
    throw new Error('App restrictions are unavailable until a native app-restriction adapter is installed.');
  }
}

const appRestrictionAdapter: AppRestrictionAdapter = new UnavailableAppRestrictionAdapter();

export function getAppBlockingStatus(): AppBlockingStatus {
  return appRestrictionAdapter.getStatus();
}
