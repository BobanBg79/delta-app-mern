import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';

// Import all your reducers here
import userReducer from './modules/users/reducers';
// Add other reducers as needed when you write more tests
// import reservationReducer from './modules/reservations/reducers';
// import apartmentReducer from './modules/apartments/reducers';

/**
 * Creates a mock Redux store for testing
 * @param {Object} initialState - Initial state to populate the store (required)
 * @returns {Object} Redux store
 */
export const createMockStore = (initialState) => {
  const rootReducer = combineReducers({
    user: userReducer,
    auth: (state = {}) => state,
    // Add other reducers here as needed when writing more tests
    // reservation: reservationReducer,
    // apartment: apartmentReducer,
  });

  return createStore(rootReducer, initialState, applyMiddleware(thunk));
};

/**
 * Renders a component with all required providers (Redux, Router)
 *
 * @example
 * // Basic usage
 * renderWithProviders(<MyComponent />);
 *
 * @example
 * // With custom initial state
 * const initialState = {
 *   user: {
 *     users: [{ id: 1, name: 'Test User' }],
 *     fetching: false,
 *     error: null,
 *   },
 * };
 * renderWithProviders(<MyComponent />, { initialState });
 *
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.initialState - Initial Redux state (optional)
 * @param {Object} options.store - Custom store (optional, will create one if not provided)
 * @returns {Object} Render result from @testing-library/react
 */
export const renderWithProviders = (
  ui,
  { initialState, store, ...renderOptions } = {}
) => {
  const testStore = store || createMockStore(initialState);

  const Wrapper = ({ children }) => (
    <Provider store={testStore}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return { store: testStore, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
