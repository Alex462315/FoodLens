/**
 * FoodLens — Main Application Entry Point
 *
 * Wraps the app with AuthProvider for auth state management.
 * AppNavigator handles switching between auth flow and main app.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {Colors} from './src/theme/colors';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
        />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
