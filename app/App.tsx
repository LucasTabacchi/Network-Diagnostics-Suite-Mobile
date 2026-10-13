import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/core/navigation/RootNavigator';
import { colors } from './src/core/theme/colors';
import { initDatabase } from './src/store';
import { SyncWorker } from './src/sync/SyncWorker';

export default function App() {
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const repos = await initDatabase();
        if (isMounted) {
          SyncWorker.startAutoSync(repos);
        }
      } catch (err) {
        console.warn('[App] Failed to init database or start auto-sync:', err);
      }
    })();

    return () => {
      isMounted = false;
      SyncWorker.stopAutoSync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
