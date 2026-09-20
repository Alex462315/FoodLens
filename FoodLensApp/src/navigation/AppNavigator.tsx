/**
 * AppNavigator — Root navigator that switches between:
 * - AuthNavigator (Landing/Register/Login) when not logged in
 * - MainNavigator (Bottom tabs + modal screens) when logged in
 */

import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import NutritionSummaryScreen from '../screens/NutritionSummaryScreen';
import ProductCompareScreen from '../screens/ProductCompareScreen';
import CommunitySubmitScreen from '../screens/CommunitySubmitScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import HistoryDetailScreen from '../screens/HistoryDetailScreen';
import {useAuth} from '../context/AuthContext';
import {Colors} from '../theme/colors';

const Stack = createNativeStackNavigator();

const MainNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Tabs" component={BottomTabNavigator} />
    <Stack.Screen
      name="NutritionSummary"
      component={NutritionSummaryScreen}
      options={{
        headerShown: true,
        title: 'Nutrition Tracker',
        headerBackTitle: 'Back',
        headerTintColor: Colors.primaryGreen,
      }}
    />
    <Stack.Screen
      name="ProductCompare"
      component={ProductCompareScreen}
      options={{
        headerShown: true,
        title: 'Compare Products',
        headerBackTitle: 'Back',
        headerTintColor: Colors.primaryGreen,
      }}
    />
    <Stack.Screen
      name="CommunitySubmit"
      component={CommunitySubmitScreen}
      options={{
        headerShown: true,
        title: 'Submit Missing Product',
        headerBackTitle: 'Back',
        headerTintColor: Colors.primaryGreen,
      }}
    />
    <Stack.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{
        headerShown: true,
        title: 'Admin Analytics',
        headerBackTitle: 'Back',
        headerTintColor: Colors.primaryGreen,
      }}
    />
    <Stack.Screen
      name="AdminUsers"
      component={AdminUsersScreen}
      options={{
        headerShown: true,
        title: 'User Management',
        headerBackTitle: 'Back',
        headerTintColor: Colors.primaryGreen,
      }}
    />
    <Stack.Screen
      name="HistoryDetail"
      component={HistoryDetailScreen}
      options={{
        headerShown: true,
        title: 'Scan Detail',
        headerBackTitle: 'History',
        headerTintColor: Colors.primaryGreen,
      }}
    />
  </Stack.Navigator>
);

const AppNavigator: React.FC = () => {
  const {token, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryGreen} />
      </View>
    );
  }

  return token ? <MainNavigator /> : <AuthNavigator />;
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
