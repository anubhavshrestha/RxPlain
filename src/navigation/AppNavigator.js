import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import DocumentLibraryScreen from '../screens/DocumentLibrary/DocumentLibraryScreen';
import DocumentCaptureScreen from '../screens/DocumentCapture/DocumentCaptureScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import DocumentViewerScreen from '../screens/DocumentViewer/DocumentViewerScreen';

import { COLORS } from '../styles/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Document stack for library and viewer
const DocumentStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DocumentLibrary" component={DocumentLibraryScreen} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    </Stack.Navigator>
  );
};

// Dashboard stack to include document viewer
const DashboardStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Documents') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Capture') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={DashboardStack} />
      <Tab.Screen name="Documents" component={DocumentStack} />
      <Tab.Screen name="Capture" component={DocumentCaptureScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
