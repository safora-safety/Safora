import { Platform, NativeModules } from 'react-native';

export interface DeviceInfo {
  manufacturer: string;
  brand: string;
  model: string;
  sdkInt: number;
}

export interface ManufacturerGuide {
  brandName: string;
  badge: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  steps: string[];
}

const SafeWalkNative = NativeModules.SafeWalkService;

export class BatteryOptimizationService {
  /**
   * Check whether SAFORA is currently exempted from Android OS battery optimizations
   */
  static async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (
      Platform.OS !== 'android' ||
      !SafeWalkNative?.isIgnoringBatteryOptimizations
    ) {
      return true; // iOS or unsupported
    }
    try {
      return await SafeWalkNative.isIgnoringBatteryOptimizations();
    } catch {
      return false;
    }
  }

  /**
   * Triggers the direct system dialog: "Let app always run in background?"
   */
  static async requestIgnoreBatteryOptimizations(): Promise<boolean> {
    if (
      Platform.OS !== 'android' ||
      !SafeWalkNative?.requestIgnoreBatteryOptimizations
    ) {
      return false;
    }
    try {
      return await SafeWalkNative.requestIgnoreBatteryOptimizations();
    } catch {
      return false;
    }
  }

  /**
   * Deep-links directly to the manufacturer's specific power management / autostart screen
   */
  static async openManufacturerPowerSettings(): Promise<boolean> {
    if (
      Platform.OS !== 'android' ||
      !SafeWalkNative?.openManufacturerPowerSettings
    ) {
      return false;
    }
    try {
      return await SafeWalkNative.openManufacturerPowerSettings();
    } catch {
      return false;
    }
  }

  /**
   * Returns device hardware manufacturer, brand, and Android SDK level
   */
  static async getDeviceInfo(): Promise<DeviceInfo> {
    if (
      Platform.OS !== 'android' ||
      !SafeWalkNative?.getDeviceManufacturerInfo
    ) {
      return {
        manufacturer: 'generic',
        brand: 'generic',
        model: 'generic',
        sdkInt: 30,
      };
    }
    try {
      return await SafeWalkNative.getDeviceManufacturerInfo();
    } catch {
      return {
        manufacturer: 'android',
        brand: 'android',
        model: 'unknown',
        sdkInt: 30,
      };
    }
  }

  /**
   * Provides precise, step-by-step instructions tailored to the citizen's specific phone OEM
   */
  static getManufacturerGuide(manufacturerStr = ''): ManufacturerGuide {
    const m = manufacturerStr.toLowerCase();

    if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
      return {
        brandName: 'Xiaomi / Redmi / POCO (MIUI / HyperOS)',
        badge: 'MIUI / HyperOS',
        riskLevel: 'HIGH',
        title: 'Crucial: Enable Autostart & No Restrictions',
        description:
          'Xiaomi aggressively terminates background services unless Autostart and No Restrictions are enabled.',
        steps: [
          'Tap "Open Device Power Settings" below.',
          'Under Permissions, toggle Autostart to ON.',
          'Go to Battery Saver and change setting from "Recommended" to "No restrictions".',
          'Lock the SAFORA card in your Recent Apps screen by pulling down and tapping the padlock.',
        ],
      };
    }

    if (m.includes('samsung')) {
      return {
        brandName: 'Samsung Galaxy (One UI)',
        badge: 'One UI',
        riskLevel: 'MEDIUM',
        title: 'Set App Battery to Unrestricted',
        description:
          'Samsung Device Care puts background safety apps into sleep mode when the screen turns off.',
        steps: [
          'Tap "Open Device Power Settings" below.',
          'Tap Battery.',
          'Select "Unrestricted" (do not use "Optimized" or "Restricted").',
          'Ensure SAFORA is NOT in the "Sleeping apps" or "Deep sleeping apps" list.',
        ],
      };
    }

    if (m.includes('oneplus') || m.includes('oppo') || m.includes('realme')) {
      return {
        brandName: 'OnePlus / Oppo / Realme (ColorOS / OxygenOS)',
        badge: 'ColorOS / OxygenOS',
        riskLevel: 'HIGH',
        title: 'Allow Background Activity & Auto-Launch',
        description:
          'ColorOS pauses background GPS and microphone recording unless Auto-Launch is permitted.',
        steps: [
          'Tap "Open Device Power Settings" below.',
          'Enable "Allow background activity" and "Allow auto-launch".',
          'Go to Battery > Advanced / More settings > Optimize battery use > SAFORA > "Don\'t optimize".',
        ],
      };
    }

    if (m.includes('vivo') || m.includes('iqoo')) {
      return {
        brandName: 'Vivo / iQOO (Funtouch OS / OriginOS)',
        badge: 'Funtouch OS',
        riskLevel: 'HIGH',
        title: 'Enable High Background Power Consumption',
        description:
          'Vivo halts locked-screen network streaming unless high background power is authorized.',
        steps: [
          'Tap "Open Device Power Settings" below.',
          'Go to Battery > High background power consumption.',
          'Find SAFORA and turn the toggle ON.',
        ],
      };
    }

    if (m.includes('huawei') || m.includes('honor')) {
      return {
        brandName: 'Huawei / Honor (EMUI / MagicOS)',
        badge: 'EMUI / MagicOS',
        riskLevel: 'HIGH',
        title: 'Manage App Launch Manually',
        description:
          'EMUI kills apps running with screen locked unless App Launch is set to Manual.',
        steps: [
          'Tap "Open Device Power Settings" below.',
          'Go to Battery > App Launch.',
          'Find SAFORA, switch from "Manage automatically" to "Manage manually".',
          'Ensure Auto-launch, Secondary launch, and Run in background are all toggled ON.',
        ],
      };
    }

    // Default Stock Android / Google Pixel / Motorola / Nokia / Nothing
    return {
      brandName: 'Android (Stock / Pixel / Motorola)',
      badge: 'Stock Android',
      riskLevel: 'LOW',
      title: 'Set App Battery Usage to Unrestricted',
      description:
        'Prevents Android Doze mode from throttling GPS and audio uploads while your phone is in your pocket.',
      steps: [
        'Tap "Open Device Power Settings" below.',
        'Tap App battery usage.',
        'Choose "Unrestricted" so SAFORA can protect you 24/7 without delays.',
      ],
    };
  }
}
