import { Provider } from 'react-redux';
import store from './store';
import Router from './router';
import { authOperations } from './modules/auth';
import { useState } from 'react';
import configureAxios from './utils/Http';
import axios from 'axios';
import './App.css';

configureAxios(store);
store.dispatch(authOperations.authenticateUser());

function App() {
  const [message, setComment] = useState(null);
  const getComment = async () => {
    try {
      const message = await axios.get('/api/messages/nona', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setComment(message.data.content);
    } catch (err) {
      console.log(err.message);
    }
  };

  return (
    <div className="App">
      <button onClick={getComment}>Click for message</button>
      {message && <p>{message}</p>}
      <Provider store={store}>
        <Router />
      </Provider>
    </div>
  );
}

export default App;
