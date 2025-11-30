import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Homepage from './Homepage';
import { USER_PERMISSIONS } from '../constants';
import { hasPermission } from '../utils/permissions';

// Mock hasPermission utility
jest.mock('../utils/permissions', () => ({
  hasPermission: jest.fn()
}));

// Mock child components
jest.mock('../components/MonthlyIncomeReport', () => {
  return function MonthlyIncomeReport() {
    return <div data-testid="monthly-income-report">Monthly Income Report</div>;
  };
});

jest.mock('../components/reports/CleaningLadyScheduledCleaningsReport', () => {
  return function CleaningLadyScheduledCleaningsReport() {
    return <div data-testid="cleaning-lady-report">Cleaning Lady Report</div>;
  };
});

jest.mock('../components/reports/TomorrowCheckoutsReport', () => {
  return function TomorrowCheckoutsReport() {
    return <div data-testid="tomorrow-checkouts-report">Tomorrow Checkouts Report</div>;
  };
});

// Helper to create mock Redux store
const createMockStore = (userState) => {
  const rootReducer = (state = {}, action) => {
    if (action.type === 'INIT') {
      return { auth: { user: userState } };
    }
    return state;
  };

  const store = createStore(rootReducer, { auth: { user: userState } });
  return store;
};

describe('Homepage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no permissions
    hasPermission.mockReturnValue(false);
  });

  describe('Basic rendering', () => {
    it('should render welcome message with user name', () => {
      const mockUser = {
        fname: 'John',
        lname: 'Doe',
        role: {
          name: 'USER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByText('Welcome John Doe')).toBeInTheDocument();
    });

    it('should render within Row and Col structure', () => {
      const mockUser = {
        fname: 'Test',
        lname: 'User',
        role: {
          name: 'USER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);
      const { container } = render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(container.querySelector('.row')).toBeInTheDocument();
      expect(container.querySelector('.col')).toBeInTheDocument();
    });
  });

  describe('TomorrowCheckoutsReport visibility', () => {
    it('should show TomorrowCheckoutsReport when user has CAN_CREATE_CLEANING permission', () => {
      hasPermission.mockReturnValue(true); // User HAS permission

      const mockUser = {
        fname: 'Manager',
        lname: 'User',
        role: {
          name: 'MANAGER',
          permissions: [
            { _id: '1', name: USER_PERMISSIONS.CAN_CREATE_CLEANING }
          ]
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('tomorrow-checkouts-report')).toBeInTheDocument();
    });

    it('should NOT show TomorrowCheckoutsReport when user lacks CAN_CREATE_CLEANING permission', () => {
      const mockUser = {
        fname: 'Regular',
        lname: 'User',
        role: {
          name: 'USER',
          permissions: [
            { _id: '1', name: 'CAN_VIEW_USER' }
          ]
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
    });

    it('should show TomorrowCheckoutsReport for OWNER role', () => {
      hasPermission.mockReturnValue(true); // User HAS permission

      const mockUser = {
        fname: 'Owner',
        lname: 'User',
        role: {
          name: 'OWNER',
          permissions: [
            { _id: '1', name: USER_PERMISSIONS.CAN_CREATE_CLEANING }
          ]
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('tomorrow-checkouts-report')).toBeInTheDocument();
    });

    it('should show TomorrowCheckoutsReport for ADMIN role', () => {
      hasPermission.mockReturnValue(true); // User HAS permission

      const mockUser = {
        fname: 'Admin',
        lname: 'User',
        role: {
          name: 'ADMIN',
          permissions: [
            { _id: '1', name: USER_PERMISSIONS.CAN_CREATE_CLEANING }
          ]
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('tomorrow-checkouts-report')).toBeInTheDocument();
    });
  });

  describe('MonthlyIncomeReport visibility', () => {
    it('should show MonthlyIncomeReport when user is ADMIN', () => {
      const mockUser = {
        fname: 'Admin',
        lname: 'User',
        role: {
          name: 'ADMIN',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('monthly-income-report')).toBeInTheDocument();
    });

    it('should NOT show MonthlyIncomeReport when user is not ADMIN', () => {
      const mockUser = {
        fname: 'Manager',
        lname: 'User',
        role: {
          name: 'MANAGER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.queryByTestId('monthly-income-report')).not.toBeInTheDocument();
    });
  });

  describe('CleaningLadyScheduledCleaningsReport visibility', () => {
    it('should show CleaningLadyScheduledCleaningsReport when user is CLEANING_LADY', () => {
      const mockUser = {
        fname: 'Ana',
        lname: 'Marić',
        role: {
          name: 'CLEANING_LADY',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('cleaning-lady-report')).toBeInTheDocument();
    });

    it('should NOT show CleaningLadyScheduledCleaningsReport when user is not CLEANING_LADY', () => {
      const mockUser = {
        fname: 'Manager',
        lname: 'User',
        role: {
          name: 'MANAGER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.queryByTestId('cleaning-lady-report')).not.toBeInTheDocument();
    });
  });

  describe('Multiple reports scenario', () => {
    it('should show both TomorrowCheckoutsReport and MonthlyIncomeReport for ADMIN with permissions', () => {
      hasPermission.mockReturnValue(true); // User HAS permission

      const mockUser = {
        fname: 'Super',
        lname: 'Admin',
        role: {
          name: 'ADMIN',
          permissions: [
            { _id: '1', name: USER_PERMISSIONS.CAN_CREATE_CLEANING }
          ]
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByTestId('tomorrow-checkouts-report')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-income-report')).toBeInTheDocument();
    });

    it('should only show MonthlyIncomeReport for ADMIN without CAN_CREATE_CLEANING permission', () => {
      const mockUser = {
        fname: 'Admin',
        lname: 'User',
        role: {
          name: 'ADMIN',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
      expect(screen.getByTestId('monthly-income-report')).toBeInTheDocument();
    });

    it('should show no reports for regular user without permissions', () => {
      const mockUser = {
        fname: 'Regular',
        lname: 'User',
        role: {
          name: 'USER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monthly-income-report')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cleaning-lady-report')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle user with no role gracefully', () => {
      const mockUser = {
        fname: 'No',
        lname: 'Role',
        role: null
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByText('Welcome No Role')).toBeInTheDocument();
      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
      expect(screen.queryByTestId('monthly-income-report')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cleaning-lady-report')).not.toBeInTheDocument();
    });

    it('should handle user with no permissions array', () => {
      const mockUser = {
        fname: 'No',
        lname: 'Permissions',
        role: {
          name: 'USER',
          permissions: undefined
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByText('Welcome No Permissions')).toBeInTheDocument();
      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
    });

    it('should handle user with empty permissions array', () => {
      const mockUser = {
        fname: 'Empty',
        lname: 'Permissions',
        role: {
          name: 'USER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);

      render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(screen.getByText('Welcome Empty Permissions')).toBeInTheDocument();
      expect(screen.queryByTestId('tomorrow-checkouts-report')).not.toBeInTheDocument();
    });
  });

  describe('Component structure and styling', () => {
    it('should apply mt-4 class to report containers', () => {
      const mockUser = {
        fname: 'Test',
        lname: 'User',
        role: {
          name: 'ADMIN',
          permissions: [
            { _id: '1', name: USER_PERMISSIONS.CAN_CREATE_CLEANING }
          ]
        }
      };

      const store = createMockStore(mockUser);
      const { container } = render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      const reportContainers = container.querySelectorAll('.mt-4');
      expect(reportContainers.length).toBeGreaterThan(0);
    });

    it('should apply mx-auto class to main column', () => {
      const mockUser = {
        fname: 'Test',
        lname: 'User',
        role: {
          name: 'USER',
          permissions: []
        }
      };

      const store = createMockStore(mockUser);
      const { container } = render(
        <Provider store={store}>
          <Homepage />
        </Provider>
      );

      expect(container.querySelector('.mx-auto')).toBeInTheDocument();
    });
  });
});
