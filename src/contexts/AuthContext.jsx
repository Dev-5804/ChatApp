import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContextDefinition';
import { getApiUrl } from '../utils/apiUrl';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const apiUrl = getApiUrl();
      console.log('Checking auth with API URL:', apiUrl);
      const response = await axios.get(`${apiUrl}/auth/user`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    const apiUrl = getApiUrl();
    console.log('Starting login with API URL:', apiUrl);
    window.location.href = `${apiUrl}/auth/google`;
  };

  const logout = async () => {
    try {
      const apiUrl = getApiUrl();
      await axios.get(`${apiUrl}/auth/logout`, {
        withCredentials: true
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
