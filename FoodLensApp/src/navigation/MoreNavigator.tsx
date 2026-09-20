/**
 * MoreNavigator — Stack navigator for the More tab.
 * Nests: MoreScreen → SettingsScreen → ChangePasswordScreen
 *
 * This allows the More tab to host sub-screens (Settings, Change Password)
 * without affecting the main bottom tab bar.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MoreScreen from '../screens/MoreScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import {Colors} from '../theme/colors';
import {FontFamily} from '../theme/typography';

export type MoreStackParamList = {
  MoreHome:       undefined;
  Settings:       undefined;
  ChangePassword: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:        {backgroundColor: Colors.background},
        headerTintColor:    Colors.primaryGreen,
        headerTitleStyle:   {fontFamily: FontFamily.semiBold, fontSize: 18},
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{title: 'Change Password'}}
      />
    </Stack.Navigator>
  );
};

export default MoreNavigator;
