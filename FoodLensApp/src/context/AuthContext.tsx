/**
 * AuthContext — React Context for authentication state
 *
 * Provides:
 * - user (id, username, email) and token
 * - login(), register(), logout() functions
 * - isLoading (true while checking stored token on app launch)
 * - Token persistence via AsyncStorage (survives app restart)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerUser,
  loginUser,
  RegisterPayload,
  LoginPayload,
  AuthResponse,
} from '../services/authService';

// Keys for AsyncStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access auth context. Must be used within AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On app launch: check AsyncStorage for a saved token/user.
   * If found, restore the auth state (auto-login).
   */
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        // If storage read fails, just start fresh (logged out)
        console.error('Failed to load stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  /**
   * Save auth data to both state and persistent storage.
   */
  const saveAuth = async (authResponse: AuthResponse) => {
    const userData: User = {
      id: authResponse.id,
      username: authResponse.username,
      email: authResponse.email,
      is_staff: authResponse.is_staff ?? false,
    };

    // Save to state
    setToken(authResponse.token);
    setUser(userData);

    // Persist to AsyncStorage
    await AsyncStorage.setItem(TOKEN_KEY, authResponse.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  /**
   * Register a new user. On success, saves token and logs in immediately.
   * Throws on failure so the calling screen can display errors.
   */
  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await registerUser(payload);
    await saveAuth(response);
  }, []);

  /**
   * Login an existing user. On success, saves token.
   * Throws on failure so the calling screen can display errors.
   */
  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginUser(payload);
    await saveAuth(response);
  }, []);

  /**
   * Logout: clear stored token and user, reset state.
   */
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear stored auth:', error);
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
