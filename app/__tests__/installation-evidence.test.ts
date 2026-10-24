import Geolocation from '@react-native-community/geolocation';
import { LocationService } from '../src/evidence/LocationService';
import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { InstallationRepository } from '../src/store/repositories/InstallationRepository';
import { Installation } from '../src/store/models';

describe('Installation evidence integrity', () => {
  it('requests an uncached position for a newly captured photo', async () => {
    const getCurrentPosition = Geolocation.getCurrentPosition as jest.Mock;
    await LocationService.getCurrentLocation(5000, 0);
    expect(getCurrentPosition).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ timeout: 5000, maximumAge: 0 }),
    );
  });

  it('does not substitute a guessed location when GPS fails', async () => {
    const getCurrentPosition = Geolocation.getCurrentPosition as jest.Mock;
    const original = getCurrentPosition.getMockImplementation();
    getCurrentPosition.mockImplementationOnce((_success, failure) => failure({ code: 3 }));
    expect(await LocationService.getCurrentLocation()).toBeNull();
    getCurrentPosition.mockImplementation(original);
  });

  it('hydrates actual photo counts including zero', async () => {
    const db = new MockDatabaseAdapter();
    await initializeSchema(db);
    const repo = new InstallationRepository(db);
    const base: Installation = {
      id: 'without-photos',
      deviceName: 'Device',
      deviceIp: '192.0.2.1',
      siteName: 'Site',
      status: 'pending',
      baseVersion: 1,
      createdAt: 1,
      updatedAt: 1,
      photos: [],
    };
    await repo.create(base);
    await repo.create({
      ...base,
      id: 'with-photo',
      photos: [{
        id: 'real-photo',
        installationId: 'with-photo',
        filePath: 'file:///documents/photo.jpg',
        capturedAt: 2,
      }],
    });
    const installations = await repo.listAll();
    expect(installations.find((item) => item.id === 'without-photos')?.photos).toEqual([]);
    expect(installations.find((item) => item.id === 'with-photo')?.photos?.[0].filePath)
      .toBe('file:///documents/photo.jpg');
  });
});
