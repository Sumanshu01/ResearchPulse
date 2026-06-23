import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const userJson = localStorage.getItem('user');

let user = null;
if (userJson) {
  try {
    user = JSON.parse(userJson);
  } catch (e) {
    localStorage.removeItem('user');
  }
}

const initialState = {
  user: user,
  token: token,
  isAuthenticated: !!token,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
      state.status = 'failed';
    },
    clearError: (state) => {
      state.error = null;
    }
  },
});

export const { setAuth, logout, setAuthError, clearError } = authSlice.actions;
export default authSlice.reducer;
