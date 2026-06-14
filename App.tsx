import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <NavigationContainer>
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
