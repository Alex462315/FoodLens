/**
 * ScanNavigator — Stack navigator for the Scan tab
 * ScanScreen (Camera) → ProductResultScreen → AIExplanationScreen
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ScanScreen from '../screens/ScanScreen';
import ProductResultScreen from '../screens/ProductResultScreen';
import AIExplanationScreen from '../screens/AIExplanationScreen';
import {Colors} from '../theme/colors';
import {FontFamily} from '../theme/typography';

const Stack = createNativeStackNavigator();

const ScanNavigator: React.FC = () => {
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
        name="ScanScreen"
        component={ScanScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ProductResultScreen"
        component={ProductResultScreen}
        options={{
          title: 'Product Details',
        }}
      />
      <Stack.Screen
        name="AIExplanationScreen"
        component={AIExplanationScreen}
        options={{
          title: 'AI Explanation',
        }}
      />
    </Stack.Navigator>
  );
};

export default ScanNavigator;
