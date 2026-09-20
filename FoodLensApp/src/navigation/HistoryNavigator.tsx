/**
 * HistoryNavigator — Stack navigator for the History tab
 * HistoryScreen (list) → HistoryDetailScreen (full scan detail)
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HistoryScreen from '../screens/HistoryScreen';
import HistoryDetailScreen from '../screens/HistoryDetailScreen';
import {Colors} from '../theme/colors';
import {FontFamily} from '../theme/typography';

const Stack = createNativeStackNavigator();

const HistoryNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.primaryGreen,
        headerTitleStyle: {
          fontFamily: FontFamily.semiBold,
          fontSize: 18,
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="HistoryScreen"
        component={HistoryScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{
          title: 'Scan Detail',
        }}
      />
    </Stack.Navigator>
  );
};

export default HistoryNavigator;
