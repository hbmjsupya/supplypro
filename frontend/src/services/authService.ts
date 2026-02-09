import request from '../utils/request';

export const login = (data: any) => {
  return request.post('/auth/signin', data);
};

export const logout = async () => {
  try {
    await request.post('/auth/signout');
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) return JSON.parse(userStr);
  return null;
};
