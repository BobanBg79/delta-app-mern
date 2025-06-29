import axios from 'axios';
import * as actions from './actions';

// Get all roles
export const getRoles = () => async (dispatch) => {
  try {
    dispatch(actions.setRoleLoading());
    const response = await axios.get('/api/roles');
    dispatch(actions.getRolesSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || 'Failed to fetch roles';
    dispatch(actions.setRoleError(errorMsg));
    return { error: errorMsg };
  }
};

// Get single role
export const getRole = (roleId) => async (dispatch) => {
  try {
    dispatch(actions.setRoleLoading());
    const response = await axios.get(`/api/roles/${roleId}`);
    dispatch(actions.getRoleSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || 'Failed to fetch role';
    dispatch(actions.setRoleError(errorMsg));
    return { error: errorMsg };
  }
};

// Update role permissions
export const updateRolePermissions = (roleId, permissions) => async (dispatch) => {
  try {
    dispatch(actions.setRoleLoading());
    const response = await axios.put(`/api/roles/${roleId}`, { permissions });
    dispatch(actions.updateRoleSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || 'Failed to update role';
    dispatch(actions.setRoleError(errorMsg));
    return { error: errorMsg };
  }
};

// Get all permissions
export const getPermissions = () => async (dispatch) => {
  try {
    const response = await axios.get('/api/permissions');
    dispatch(actions.getPermissionsSuccess(response.data));
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || 'Failed to fetch permissions';
    dispatch(actions.setRoleError(errorMsg));
    return { error: errorMsg };
  }
};
