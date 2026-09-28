/**
 * BottomTabNavigator — 5-tab navigation matching the Figma design
 * Home | History | Scan (elevated, circular green) | Profile | More
 * Fully responsive to Light and Dark mode.
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HistoryNavigator from './HistoryNavigator';
import ScanNavigator from './ScanNavigator';
import ProfileNavigator from './ProfileNavigator';
import MoreNavigator from './MoreNavigator';
import {useTheme} from '../theme/ThemeContext';
import {FontFamily, FontSize} from '../theme/typography';
import {Shadow} from '../theme/spacing';

const Tab = createBottomTabNavigator();

const TabIcon: React.FC<{
  name: string;
  focused: boolean;
  isScan?: boolean;
  colors: any;
}> = ({name, focused, isScan, colors}) => {
  const iconMap: Record<string, string> = {
    Home: '🏠',
    History: '📋',
    Scan: '📷',
    Profile: '👤',
    More: '•••',
  };

  if (isScan) {
    return (
      <View style={styles.scanIconContainer}>
        <Text style={styles.scanIcon}>{iconMap[name]}</Text>
      </View>
    );
  }

  return (
    <Text
      style={[
        styles.tabIcon,
        {color: focused ? colors.navActive : colors.navInactive},
      ]}>
      {iconMap[name]}
    </Text>
  );
};

const ScanTabButton = (props: any) => {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      style={styles.scanButtonOuter}
      onPress={props.onPress}
      activeOpacity={0.85}>
      <View
        style={[
          styles.scanButtonInner,
          {backgroundColor: colors.primaryGreen},
        ]}>
        {props.children}
      </View>
    </TouchableOpacity>
  );
};

const BottomTabNavigator: React.FC = () => {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.navBg,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
        ],
        tabBarActiveTintColor: colors.navActive,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="Home" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="History" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="Scan" focused={focused} isScan colors={colors} />
          ),
          tabBarButton: props => <ScanTabButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="Profile" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="More" focused={focused} colors={colors} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    ...Shadow.lg,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
  },
  tabIcon: {
    fontSize: 20,
  },
  scanButtonOuter: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.xl,
  },
  scanIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});

export default BottomTabNavigator;
