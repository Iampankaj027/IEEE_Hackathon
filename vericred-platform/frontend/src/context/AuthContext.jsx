import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vericred_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize session and verify token on mount
  useEffect(() => {
    async function initializeAuth() {
      const storedToken = localStorage.getItem('vericred_token');
      const storedUser = localStorage.getItem('vericred_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token against backend session endpoint
          const response = await axiosInstance.get('/auth/me');
          if (response.data && response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('vericred_user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          // Token expired or invalid
          console.warn('Session verification failed, clearing auth state.');
          logoutUser();
        }
      }
      setLoading(false);
    }

    initializeAuth();
  }, []);

  /**
   * Authenticates user with email and password
   */
  const loginUser = async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { token: jwtToken, user: userData } = response.data;
        
        localStorage.setItem('vericred_token', jwtToken);
        localStorage.setItem('vericred_user', JSON.stringify(userData));
        
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: 'Invalid server response.' };
    } catch (error) {
      const errorMessage =
        error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : error.message;
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Registers a new user account
   */
  const registerUser = async (payload) => {
    try {
      const response = await axiosInstance.post('/auth/register', payload);
      if (response.data && response.data.success) {
        const { token: jwtToken, user: userData } = response.data;

        localStorage.setItem('vericred_token', jwtToken);
        localStorage.setItem('vericred_user', JSON.stringify(userData));

        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: response.data?.message || 'Registration failed.' };
    } catch (error) {
      const errorMessage =
        error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : error.message;
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Clears session and logs user out
   */
  const logoutUser = () => {
    localStorage.removeItem('vericred_token');
    localStorage.removeItem('vericred_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const isAuthenticated = !!token && !!user;
  const isStudent = user?.role === 'STUDENT';
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'HOD_ADMIN';
  const isAdmin = user?.role === 'HOD_ADMIN';

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isStudent,
    isFaculty,
    isAdmin,
    loginUser,
    registerUser,
    logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}