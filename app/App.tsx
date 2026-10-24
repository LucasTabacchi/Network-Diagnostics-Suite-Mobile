import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/core/navigation/RootNavigator';
import { colors } from './src/core/theme/colors';
import { initDatabase } from './src/store';
import { SyncWorker } from './src/sync/SyncWorker';

export default function App() {
  const [databaseState, setDatabaseState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const repos = await initDatabase();
        if (isMounted) {
          setDatabaseState('ready');
          try {
            SyncWorker.startAutoSync(repos);
          } catch (err) {
            console.warn('[App] Failed to start auto-sync:', err);
          }
        }
      } catch (err) {
        console.warn('[App] Failed to init database:', err);
        if (isMounted) setDatabaseState('error');
      }
    })();

    return () => {
      isMounted = false;
      SyncWorker.stopAutoSync();
    };
  }, [retryCount]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {databaseState === 'ready' ? (
        <RootNavigator />
      ) : (
        <View style={styles.startup}>
          {databaseState === 'loading' ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.message}>Cargando datos locales…</Text>
            </>
          ) : (
            <>
              <Text style={styles.message}>No se pudo abrir el almacenamiento local.</Text>
              <TouchableOpacity
                style={styles.retryButton}
                accessibilityLabel="Reintentar inicialización"
                onPress={() => {
                  setDatabaseState('loading');
                  setRetryCount((count) => count + 1);
                }}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  startup: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: { color: colors.onSurface, textAlign: 'center', fontSize: 16 },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: colors.onPrimary, fontWeight: '600' },
});
