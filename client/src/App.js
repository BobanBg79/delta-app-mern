import { Provider } from 'react-redux';
import store from './store';
import Router from './router';
import { authOperations } from './modules/auth';
import configureAxios from './utils/Http';
import './App.css';

configureAxios(store);
store.dispatch(authOperations.authenticateUser());

function App() {
  return (
    <div className="App">
      <Provider store={store}>
        <Router />
      </Provider>
    </div>
  );
}

export default App;
