/**
 * HistoryNavigator — Stack navigator for the History tab
 * HistoryScreen (list) → HistoryDetailScreen (full scan detail)
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HistoryScreen from '../screens/HistoryScreen';
import HistoryDetailScreen from '../screens/HistoryDetailScreen';
import {Colors} from '../theme/colors';
import {useTheme} from '../theme';
import {FontFamily} from '../theme/typography';

const Stack = createNativeStackNavigator();

const HistoryNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primaryGreen,
        headerTitleStyle: {
          fontFamily: FontFamily.semiBold,
          fontSize: 18,
          color: colors.darkText,
        },
        headerShadowVisible: false,
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
