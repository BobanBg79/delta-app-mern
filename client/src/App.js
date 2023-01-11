import { Provider } from 'react-redux';
import store from './store';
import Router from './router';
import { authOperations } from './modules/auth';
import configureAxios from './utils/Http';
import MessageToast from './components/MessageToast';
import './styles/main.scss';

configureAxios(store);
store.dispatch(authOperations.authenticateUser());

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <MessageToast />
        <Router />
      </div>
    </Provider>
  );
}

export default App;
