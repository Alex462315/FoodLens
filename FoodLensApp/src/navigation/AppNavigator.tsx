/**
 * AppNavigator — Root navigator that switches between:
 * - AuthNavigator (Landing/Register/Login) when not logged in
 * - BottomTabNavigator (Dashboard + tabs) when logged in
 *
 * Shows a loading screen while checking for a stored token.
 */

import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import {useAuth} from '../context/AuthContext';
import {Colors} from '../theme/colors';

const AppNavigator: React.FC = () => {
  const {token, isLoading} = useAuth();

  // Show loading spinner while checking stored auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryGreen} />
      </View>
    );
  }

  // If token exists → show main app; otherwise → show auth flow
  return token ? <BottomTabNavigator /> : <AuthNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

export default AppNavigator;
