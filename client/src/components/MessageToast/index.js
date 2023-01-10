import React from 'react';
import Alert from 'react-bootstrap/Alert';
import { useSelector } from 'react-redux';
import './styles.scss';

const MessageToast = () => {
  const alertMessages = useSelector((state) => state.alertMessages);
  if (!alertMessages.messages) return null;
  const { messages, type } = alertMessages;

  return (
    <div id="message-toast-container">
      {messages.map(({ msg }) => (
        <Alert key={msg} variant={type}>
          {msg}
        </Alert>
      ))}
    </div>
  );
};

export default MessageToast;
