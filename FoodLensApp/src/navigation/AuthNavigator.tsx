/**
 * AuthNavigator — Stack navigator for unauthenticated screens
 * Landing → Register / Login
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LandingScreen from '../screens/LandingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import {Colors} from '../theme/colors';
import {useTheme} from '../theme';
import {FontFamily} from '../theme/typography';

export type AuthStackParamList = {
  Landing: undefined;
  Register: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Landing"
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
        name="Landing"
        component={LandingScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Log In',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
