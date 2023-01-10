import messageActions from './actions';
import messageConstants from './constants';

const { SUCCESS, ERROR, WARNING } = messageConstants;

const showMessageToast = (originalMessage, type) => async (dispatch) => {
  const message = typeof originalMessage === 'string' ? [{ msg: originalMessage }] : originalMessage;

  switch (type) {
    case SUCCESS:
      dispatch(messageActions.showSuccessMessage(message));
      break;
    case ERROR:
      dispatch(messageActions.showErrorMessage(message));
      break;
    case WARNING:
      dispatch(messageActions.showWarningMessage(message));
      break;
    default:
      break;
  }
  setTimeout(() => dispatch(messageActions.clearMessage()), 2500);
};

const messageOperations = {
  showMessageToast,
};

export default messageOperations;
