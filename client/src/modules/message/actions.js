import types from './types';

const setAlertMessages = (alerMessagesArray, type) => ({
  alerMessagesArray,
  type,
});

const showSuccessMessage = (payload) => ({
  type: types.SHOW_SUCCESS_MESSAGE,
  payload,
});
const showWarningMessage = (payload) => ({
  type: types.SHOW_WARNING_MESSAGE,
  payload,
});
const showErrorMessage = (payload) => ({
  type: types.SHOW_ERROR_MESSAGE,
  payload,
});
const clearMessage = () => ({
  type: types.CLEAR_MESSAGE,
});

const messageActionsObj = {
  setAlertMessages,
  showSuccessMessage,
  showWarningMessage,
  showErrorMessage,
  clearMessage,
};

export default messageActionsObj;
