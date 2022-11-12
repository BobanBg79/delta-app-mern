import { useState } from 'react';
import axios from 'axios';
import logo from './logo.svg';
import './App.css';

function App() {
  const [message, setComment] = useState(null);
  console.log(111, message);
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

  const createComment = async () => {
    try {
      await axios.post(
        '/api/messages',
        {
          name: 'nona',
          content: 'Dje ste dje ste!!!',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      console.log(err.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>This will be mern app one day</h1>
        <button onClick={getComment}>Click for message</button>
        {message && <p>{message}</p>}
        <button onClick={createComment}>Create a message</button>
      </header>
    </div>
  );
}

export default App;
