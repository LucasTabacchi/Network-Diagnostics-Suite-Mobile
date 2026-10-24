import Geolocation from '@react-native-community/geolocation';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export class LocationService {
  /**
   * Returns a measured position, or null when location is unavailable.
   */
  static async getCurrentLocation(timeoutMs = 10000, maximumAgeMs = 15000): Promise<GpsCoordinates | null> {
    return new Promise((resolve) => {
      try {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp || Date.now(),
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maximumAgeMs }
        );
      } catch {
        resolve(null);
      }
    });
  }
}
