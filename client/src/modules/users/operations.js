import axios from 'axios';
import * as actions from './actions';
import { msgOperations, messageConstants } from '../message';

const { SUCCESS, ERROR } = messageConstants;
const { showMessageToast } = msgOperations;

// Get all users (including inactive)
export const getUsers = () => async (dispatch) => {
  try {
    dispatch(actions.setUsersFetchStart());
    // Always fetch all users including inactive ones - filtering happens in the UI
    const res = await axios.get('/api/users?includeInactive=true');
    dispatch(actions.setUsers(res.data.users));
  } catch (err) {
    console.error('Error fetching users:', err);
    const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to fetch users';
    dispatch(actions.setUsersError(errorMsg));
  } finally {
    dispatch(actions.setUsersFetchEnd());
  }
};

// Get user by ID
export const getUser = (userId) => async (dispatch) => {
  try {
    dispatch(actions.setUserFetchStart());
    const res = await axios.get(`/api/users/${userId}`);
    dispatch(actions.setUser(res.data.user));
  } catch (err) {
    console.error('Error fetching user:', err);
    const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to fetch user';
    dispatch(actions.setUserError(errorMsg));
  } finally {
    dispatch(actions.setUserFetchEnd());
  }
};

// Create new user
export const createUser = (userData) => async (dispatch) => {
  try {
    dispatch(actions.setUserFetchStart());
    const res = await axios.post('/api/users/register', userData);
    dispatch(actions.setUser(res.data.user));
    dispatch(showMessageToast('User created successfully!', SUCCESS));
  } catch (err) {
    console.error('Error creating user:', err);
    const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to create user';
    dispatch(showMessageToast(errorMsg, ERROR));
    dispatch(actions.setUserError(errorMsg));
    return { error: true };
  } finally {
    dispatch(actions.setUserFetchEnd());
  }
};

// Update user
export const updateUser = (userId, userData) => async (dispatch) => {
  try {
    dispatch(actions.setUserFetchStart());
    const res = await axios.put(`/api/users/${userId}`, userData);
    dispatch(actions.setUser(res.data.user));
    dispatch(showMessageToast('User updated successfully!', SUCCESS));
  } catch (err) {
    console.error('Error updating user:', err);
    const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to update user';
    dispatch(showMessageToast(errorMsg, ERROR));
    dispatch(actions.setUserError(errorMsg));
    return { error: true };
  } finally {
    dispatch(actions.setUserFetchEnd());
  }
};
