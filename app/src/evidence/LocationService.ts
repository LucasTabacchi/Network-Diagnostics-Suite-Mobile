import Geolocation from '@react-native-community/geolocation';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  isEstimated?: boolean;
}

export class LocationService {
  /**
   * Fetches current GPS coordinates with high accuracy and transparent fallback flag.
   */
  static async getCurrentLocation(timeoutMs = 10000): Promise<GpsCoordinates> {
    return new Promise((resolve) => {
      try {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp || Date.now(),
              isEstimated: false,
            });
          },
          () => {
            // Signal loss fallback: Campus UADER FCyT Concepción del Uruguay (-32.4825, -58.2321)
            // Marked explicitly as estimated
            resolve({
              latitude: -32.4825,
              longitude: -58.2321,
              accuracy: undefined,
              timestamp: Date.now(),
              isEstimated: true,
            });
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
        );
      } catch (_) {
        resolve({
          latitude: -32.4825,
          longitude: -58.2321,
          accuracy: undefined,
          timestamp: Date.now(),
          isEstimated: true,
        });
      }
    });
  }
}
