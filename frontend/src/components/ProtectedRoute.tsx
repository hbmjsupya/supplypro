import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard: redirects unauthenticated users to /login.
 *
 * Checks for both a valid token AND user object in localStorage.
 * If both are present, renders children. Otherwise, redirects to /login
 * and preserves the attempted URL in state for post-login redirect.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = getCurrentUser();

  const isAuthenticated = token
    && token !== 'null'
    && token !== 'undefined'
    && user !== null;

  if (!isAuthenticated) {
    // Clear any stale/invalid auth data
    if (token && (token === 'null' || token === 'undefined')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
