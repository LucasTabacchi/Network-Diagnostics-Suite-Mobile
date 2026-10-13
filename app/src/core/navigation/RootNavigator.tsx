import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Icon, IconName } from '../ui';
import { MainTabParamList, RootStackParamList } from './types';

// Tab screens
import { HomeScreen } from '../../features/home/HomeScreen';
import { NetworkScreen } from '../../features/network/NetworkScreen';
import { InstallationsScreen } from '../../features/installations/InstallationsScreen';
import { HistoryScreen } from '../../features/history/HistoryScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';

// Stack screens
import { DeviceDetailScreen } from '../../features/device/DeviceDetailScreen';
import { SshConsoleScreen } from '../../features/ssh/SshConsoleScreen';
import { QrScannerScreen } from '../../features/qr/QrScannerScreen';
import { NewInstallationScreen } from '../../features/installations/NewInstallationScreen';
import { PdfPreviewScreen } from '../../features/reporting/PdfPreviewScreen';
import { SyncQueueScreen } from '../../features/sync/SyncQueueScreen';
import { SyncConflictScreen } from '../../features/sync/SyncConflictScreen';
import { AddCredentialScreen } from '../../features/settings/AddCredentialScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_CONFIG: Record<
  keyof MainTabParamList,
  { label: string; icon: IconName }
> = {
  Home: { label: 'Inicio', icon: 'home' },
  Network: { label: 'Red', icon: 'network' },
  Installations: { label: 'Instalar', icon: 'install' },
  History: { label: 'Historial', icon: 'history' },
  Settings: { label: 'Ajustes', icon: 'settings' },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.tabBar, { height: 56 + bottomPadding, paddingBottom: bottomPadding }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name as keyof MainTabParamList] || {
          label: route.name,
          icon: 'home' as IconName,
        };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused ? colors.primary : colors.muted;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
            testID={options.tabBarButtonTestID || `tab-${route.name}`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {isFocused && <View style={styles.topIndicator} />}
            <Icon name={config.icon} size={22} color={color} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.tabLabel, { color }]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Network" component={NetworkScreen} />
      <Tab.Screen name="Installations" component={InstallationsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
        <Stack.Screen name="SshConsole" component={SshConsoleScreen} />
        <Stack.Screen name="QrScanner" component={QrScannerScreen} />
        <Stack.Screen name="NewInstallation" component={NewInstallationScreen} />
        <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} />
        <Stack.Screen name="SyncQueue" component={SyncQueueScreen} />
        <Stack.Screen name="SyncConflict" component={SyncConflictScreen} />
        <Stack.Screen name="AddCredential" component={AddCredentialScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  topIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  tabLabel: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
