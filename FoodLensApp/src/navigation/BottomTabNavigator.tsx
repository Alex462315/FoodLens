/**
 * BottomTabNavigator — 5-tab navigation matching the Figma design
 * Home | History | Scan (elevated, circular green) | Profile | More
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HistoryNavigator from './HistoryNavigator';
import ScanNavigator from './ScanNavigator';
import ProfileNavigator from './ProfileNavigator';
import MoreNavigator from './MoreNavigator';
import {Colors} from '../theme/colors';
import {FontFamily, FontSize} from '../theme/typography';
import {Shadow} from '../theme/spacing';

const Tab = createBottomTabNavigator();

// Icon component using text symbols (will be replaced with vector icons after npm install)
const TabIcon: React.FC<{name: string; focused: boolean; isScan?: boolean}> = ({
  name,
  focused,
  isScan,
}) => {
  // Map tab names to unicode/emoji icons as placeholder
  // These will be swapped to react-native-vector-icons in a later step
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
        {color: focused ? Colors.navActive : Colors.navInactive},
      ]}>
      {iconMap[name]}
    </Text>
  );
};

// Custom Scan button (elevated, circular)
const ScanTabButton: React.FC<{children: React.ReactNode; onPress?: () => void}> = ({
  children,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.scanButtonOuter}
    onPress={onPress}
    activeOpacity={0.85}>
    <View style={styles.scanButtonInner}>{children}</View>
  </TouchableOpacity>
);

const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.navActive,
        tabBarInactiveTintColor: Colors.navInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="History" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanNavigator}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon name="Scan" focused={focused} isScan />
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
            <TabIcon name="Profile" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({focused}) => <TabIcon name="More" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
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
    backgroundColor: Colors.primaryGreen,
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
    color: Colors.white,
  },
});

export default BottomTabNavigator;
