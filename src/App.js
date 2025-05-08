import React, { useState, createContext, useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './styles/theme';
import { Platform, View, Text, TouchableOpacity } from 'react-native';

// Import navigators
import { AuthNavigator, AppNavigator } from './navigation';

// Import storage initialization
import { initializeStorage } from './services/LocalStorageService';

// Create Auth Context
export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

const RootStack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isWebWarningDismissed, setIsWebWarningDismissed] = useState(false);

  // Initialize the app data on startup
  useEffect(() => {
    const setupApp = async () => {
      try {
        // Initialize local storage with initial data if needed
        await initializeStorage();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupApp();
  }, []);

  if (isLoading) {
    // You could return a splash screen here
    return null;
  }

  // Show a warning on web platform
  if (Platform.OS === 'web' && !isWebWarningDismissed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.background }}>
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 10, 
          padding: 20, 
          maxWidth: 500, 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: 15 }}>RxPlain Web Notice</Text>
          
          <Text style={{ fontSize: 16, marginBottom: 10, lineHeight: 22 }}>
            You are currently running RxPlain on a web browser. Some features are limited or unavailable on web, including:
          </Text>
          
          <View style={{ marginLeft: 10, marginBottom: 15 }}>
            <Text style={{ fontSize: 15, marginBottom: 5 }}>• Camera capture functionality</Text>
            <Text style={{ fontSize: 15, marginBottom: 5 }}>• Document and image picking</Text>
            <Text style={{ fontSize: 15, marginBottom: 5 }}>• PDF document viewing</Text>
          </View>
          
          <Text style={{ fontSize: 16, marginBottom: 20, lineHeight: 22 }}>
            For the full experience with all features, please use the iOS or Android app.
          </Text>
          
          <TouchableOpacity 
            onPress={() => setIsWebWarningDismissed(true)}
            style={{
              backgroundColor: COLORS.primary,
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>Continue to Web Version</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

// Root navigator that uses the auth context
const RootNavigator = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="App" component={AppNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

export default App;
