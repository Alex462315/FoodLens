/**
 * ProfileNavigator — Stack navigator for the Profile tab
 * ProfileList → ProfileForm (create/edit)
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HealthProfileListScreen from '../screens/HealthProfileListScreen';
import HealthProfileFormScreen from '../screens/HealthProfileFormScreen';
import {Colors} from '../theme/colors';
import {FontFamily} from '../theme/typography';

const Stack = createNativeStackNavigator();

const ProfileNavigator: React.FC = () => {
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
        name="HealthProfileList"
        component={HealthProfileListScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="HealthProfileForm"
        component={HealthProfileFormScreen}
        options={({route}: any) => ({
          title:
            route.params?.mode === 'edit' ? 'Edit Profile' : 'New Profile',
        })}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
