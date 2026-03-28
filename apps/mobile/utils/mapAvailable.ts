import { Platform, NativeModules } from 'react-native';

// Checks whether the MapLibre native module is registered in the current runtime.
// In Expo Go the JS bundle loads but native views (MLRNCamera, MLRNMapView, etc.)
// are NOT registered, so rendering them throws:
//   "Invariant Violation: View config not found for component 'MLRNCamera'"
//
// The canonical check is NativeModules.MLRNModule — MapLibre registers this when
// the native bridge is successfully linked. If it's absent, we skip all map rendering.
function isMapLibreNativeAvailable(): boolean {
  try {
    return Platform.OS !== 'web' && !!NativeModules.MLRNModule;
  } catch {
    return false;
  }
}

export const MAP_RENDERING_AVAILABLE: boolean = isMapLibreNativeAvailable();
