import * as types from './types';

export const setRoleLoading = () => ({
  type: types.ROLE_LOADING,
});

export const setRoleError = (error) => ({
  type: types.ROLE_ERROR,
  payload: error,
});

export const getRolesSuccess = (roles) => ({
  type: types.GET_ROLES_SUCCESS,
  payload: roles,
});

export const getRoleSuccess = (role) => ({
  type: types.GET_ROLE_SUCCESS,
  payload: role,
});

export const updateRoleSuccess = (role) => ({
  type: types.UPDATE_ROLE_SUCCESS,
  payload: role,
});

export const resetRole = () => ({
  type: types.RESET_ROLE,
});

export const getPermissionsSuccess = (permissions) => ({
  type: types.GET_PERMISSIONS_SUCCESS,
  payload: permissions,
});
