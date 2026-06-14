import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HomeScreen } from './src/screens/HomeScreen';
import { FoodScanScreen } from './src/screens/FoodScanScreen';
import { ExerciseScreen } from './src/screens/ExerciseScreen';
import { StepsScreen } from './src/screens/StepsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, borderRadius } from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap; color: string }> = {
  Home: { focused: 'home', outline: 'home-outline', color: colors.primary },
  Scan: { focused: 'camera', outline: 'camera-outline', color: colors.secondary },
  Exercise: { focused: 'barbell', outline: 'barbell-outline', color: colors.accent },
  Steps: { focused: 'walk', outline: 'walk-outline', color: colors.accentOrange },
  History: { focused: 'time', outline: 'time-outline', color: colors.accentBlue },
  Profile: { focused: 'person', outline: 'person-outline', color: colors.primary },
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error: String(error) };
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 20 }}>
          <Text style={{ color: '#FF6584', fontSize: 18, fontWeight: 'bold', marginTop: 60 }}>App Error</Text>
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 12 }}>{this.state.error}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, border: colors.border, primary: colors.primary, text: colors.text, notification: colors.secondary } }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: TAB_ICONS[route.name]?.color ?? colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarLabelStyle: styles.tabBarLabel,
              tabBarIcon: ({ focused, color, size }) => {
                const icons = TAB_ICONS[route.name];
                if (!icons) return null;
                return (
                  <View style={[styles.tabIconWrapper, focused && { backgroundColor: color + '20' }]}>
                    <Ionicons
                      name={focused ? icons.focused : icons.outline}
                      size={size - 2}
                      color={color}
                    />
                  </View>
                );
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Scan" component={FoodScanScreen} />
            <Tab.Screen name="Exercise" component={ExerciseScreen} />
            <Tab.Screen name="Steps" component={StepsScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    position: 'absolute',
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconWrapper: {
    width: 36,
    height: 30,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
