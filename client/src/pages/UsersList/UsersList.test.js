import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import UsersList from './index';
import { USER_PERMISSIONS } from '../../constants';

// Mock the getUsers operation to prevent real API calls
jest.mock('../../modules/users/operations', () => ({
  getUsers: () => async () => {
    // Do nothing - return empty promise
  },
}));

describe('UsersList Component', () => {
  // Common auth state for all tests
  const mockAuthState = {
    user: {
      role: {
        permissions: [],
      },
    },
  };

  it('renders without crashing', () => {
    const initialState = {
      user: {
        users: [],
        fetching: false,
        error: null,
      },
      auth: mockAuthState,
    };
    renderWithProviders(<UsersList />, { initialState });
    // Check that the component renders by looking for the heading
    expect(screen.getByRole('heading', { name: /Users/i })).toBeInTheDocument();
  });

  it('displays loading spinner when fetching', () => {
    const initialState = {
      user: {
        users: [],
        fetching: true,
        error: null,
      },
      auth: mockAuthState,
    };
    renderWithProviders(<UsersList />, { initialState });
    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();
  });

  it('displays "No users found" when users array is empty', () => {
    const initialState = {
      user: {
        users: [],
        fetching: false,
        error: null,
      },
      auth: mockAuthState,
    };
    renderWithProviders(<UsersList />, { initialState });
    expect(screen.getByText(/No users found/i)).toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    const initialState = {
      user: {
        users: [],
        fetching: false,
        error: 'Failed to load users',
      },
      auth: mockAuthState,
    };
    renderWithProviders(<UsersList />, { initialState });
    expect(screen.getByText(/Failed to load users/i)).toBeInTheDocument();
  });

  it('renders user table with data', () => {
    const mockUsers = [
      {
        _id: '1',
        username: 'test@example.com',
        fname: 'John',
        lname: 'Doe',
        role: { name: 'Admin' },
        createdBy: { username: 'admin@example.com' },
      },
      {
        _id: '2',
        username: 'user2@example.com',
        fname: 'Jane',
        lname: 'Smith',
        role: { name: 'User' },
        createdBy: { username: 'admin@example.com' },
      },
    ];

    const initialState = {
      user: {
        users: mockUsers,
        fetching: false,
        error: null,
      },
      auth: mockAuthState,
    };

    renderWithProviders(<UsersList />, { initialState });

    // Check if table headers are rendered
    expect(screen.getByText(/Username \(Email\)/i)).toBeInTheDocument();
    expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Name/i)).toBeInTheDocument();

    // Check if user data is rendered
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Smith')).toBeInTheDocument();
  });

  it('does not show "Create User" button when user lacks CAN_CREATE_USER permission', () => {
    const initialState = {
      user: {
        users: [],
        fetching: false,
        error: null,
      },
      auth: {
        user: {
          role: {
            permissions: [], // No permissions
          },
        },
      },
    };

    renderWithProviders(<UsersList />, { initialState });

    // Check that "Create User" button is NOT in the document
    expect(screen.queryByText(/Create User/i)).not.toBeInTheDocument();
  });

  it('shows "Create User" button when user has CAN_CREATE_USER permission', () => {
    const initialState = {
      user: {
        users: [],
        fetching: false,
        error: null,
      },
      auth: {
        user: {
          role: {
            permissions: [USER_PERMISSIONS.CAN_CREATE_USER], // Array of strings
          },
        },
      },
    };

    renderWithProviders(<UsersList />, { initialState });

    // Check that "Create User" button IS in the document
    expect(screen.getByText(/Create User/i)).toBeInTheDocument();
  });
});
