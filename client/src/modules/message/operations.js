import messageActions from './actions';

const showMsg = (message, type) => async dispatch => {
  switch (type) {
    case 'success':
      dispatch(messageActions.showSuccessMessage(message));
      break;
    case 'error':
      dispatch(messageActions.showErrorMessage(message));
      break;
    case 'warning':
      dispatch(messageActions.showWarningMessage(message));
      break;
    default:
      break;
  }
  setTimeout(() => dispatch(messageActions.clearMessage()), 2500);
};

export default {
  showMsg,
};
