import { Platform } from 'react-native';

// Dynamically check whether the MapLibre native module is actually registered
// in the current runtime (dev build vs Expo Go).
// In Expo Go, the JS bundle loads but MLRNCamera is NOT in the native view registry,
// so any attempt to render it throws: "Invariant Violation: View config not found for MLRNCamera"
function checkMapLibreNativeAvailable(): boolean {
  try {
    // NativeModules check — MapLibre registers 'MLRNModule' when linked
    const { NativeModules } = require('react-native');
    if (!NativeModules.MLRNModule) return false;

    // Secondary check: UIManager view registry (Fabric and Paper)
    const { UIManager } = require('react-native');
    const viewRegistry: Record<string, any> =
      (UIManager as any).getViewManagerConfig ||
      (UIManager as any).ViewManagerNames ||
      {};
    // On old arch (Paper), getViewManagerConfig('MLRNCamera') throws/returns null if not found
    if (typeof (UIManager as any).getViewManagerConfig === 'function') {
      const cfg = (UIManager as any).getViewManagerConfig('MLRNCamera');
      return cfg != null;
    }
    // On new arch (Fabric), presence of MLRNModule alone is enough
    return true;
  } catch {
    return false;
  }
}

export const MAP_RENDERING_AVAILABLE: boolean = Platform.OS !== 'web' && checkMapLibreNativeAvailable();
