import { render, screen, waitFor, act } from '@testing-library/react';
import TomorrowCheckoutsReport from './TomorrowCheckoutsReport';
import * as cleaningOperations from '../../modules/cleaning/operations';

// Mock the cleaning operations module
jest.mock('../../modules/cleaning/operations');

describe('TomorrowCheckoutsReport Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading spinner initially', () => {
      // Mock to delay response
      cleaningOperations.getCheckoutTimelineDashboardData.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TomorrowCheckoutsReport />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch checkout timeline dashboard data';
      cleaningOperations.getCheckoutTimelineDashboardData.mockRejectedValue(
        new Error(errorMessage)
      );

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display custom error message from API', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockRejectedValue(
        new Error('Network error occurred')
      );

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should display "No checkouts" message when apartments array is empty', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue({
        date: '2025-11-30',
        apartments: []
      });

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/no checkouts scheduled for tomorrow/i)).toBeInTheDocument();
      });
    });

    it('should display the formatted date in header', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue({
        date: '2025-11-30',
        apartments: []
      });

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        // Date is formatted by formatDateDefault, e.g., "30 Nov 2025"
        expect(screen.getByText(/30 Nov 2025/)).toBeInTheDocument();
      });
    });
  });

  describe('Data display', () => {
    const mockDashboardData = {
      date: '2025-11-30',
      apartments: [
        {
          apartment: { _id: '1', name: 'Morača' },
          checkoutReservation: {
            _id: 'res1',
            plannedCheckIn: '2025-11-29',
            plannedCheckOut: '2025-11-30',
            plannedCheckoutTime: '11:00',
            guest: { fname: 'John', lname: 'Doe' }
          },
          checkinReservation: {
            _id: 'res2',
            plannedCheckIn: '2025-11-30',
            plannedArrivalTime: '14:00',
            guest: { fname: 'Jane', lname: 'Smith' }
          },
          scheduledCleanings: [],
          cleaningWindow: {
            startTime: '11:00',
            endTime: '14:00',
            durationMinutes: 180,
            isCritical: false,
            isInvalid: false
          },
          isLateCheckout: false,
          isEarlyCheckin: false
        }
      ]
    };

    it('should display apartment name', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(mockDashboardData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Morača')).toBeInTheDocument();
      });
    });

    it('should display checkout time', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(mockDashboardData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('11:00')).toBeInTheDocument();
      });
    });

    it('should display current guest name', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(mockDashboardData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display next checkin guest name', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(mockDashboardData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(mockDashboardData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Apartment')).toBeInTheDocument();
        expect(screen.getByText('Reservation Period')).toBeInTheDocument();
        expect(screen.getByText('Checkout Time')).toBeInTheDocument();
        expect(screen.getByText('Current Guest')).toBeInTheDocument();
        expect(screen.getByText('Next Check-in')).toBeInTheDocument();
      });
    });
  });

  describe('Late checkout badge', () => {
    it('should display "Late check-out!" badge when isLateCheckout is true', async () => {
      const lateCheckoutData = {
        date: '2025-11-30',
        apartments: [
          {
            apartment: { _id: '1', name: 'Tara' },
            checkoutReservation: {
              _id: 'res1',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '12:00', // Late!
              guest: { fname: 'Test', lname: 'User' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: {
              startTime: '12:00',
              endTime: '14:00',
              durationMinutes: 120,
              isCritical: false,
              isInvalid: false
            },
            isLateCheckout: true,
            isEarlyCheckin: false
          }
        ]
      };

      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(lateCheckoutData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Late check-out!')).toBeInTheDocument();
      });
    });

    it('should NOT display "Late check-out!" badge when isLateCheckout is false', async () => {
      const normalCheckoutData = {
        date: '2025-11-30',
        apartments: [
          {
            apartment: { _id: '1', name: 'Tara' },
            checkoutReservation: {
              _id: 'res1',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '10:00', // Not late
              guest: { fname: 'Test', lname: 'User' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: {
              startTime: '10:00',
              endTime: '14:00',
              durationMinutes: 240,
              isCritical: false,
              isInvalid: false
            },
            isLateCheckout: false,
            isEarlyCheckin: false
          }
        ]
      };

      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(normalCheckoutData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Late check-out!')).not.toBeInTheDocument();
      });
    });
  });

  describe('No next checkin scenario', () => {
    it('should display "No next reservation" when checkinReservation is null', async () => {
      const noCheckinData = {
        date: '2025-11-30',
        apartments: [
          {
            apartment: { _id: '1', name: 'Ara' },
            checkoutReservation: {
              _id: 'res1',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '11:00',
              guest: { fname: 'Solo', lname: 'Guest' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: {
              startTime: '11:00',
              endTime: '14:00',
              durationMinutes: 180,
              isCritical: false,
              isInvalid: false
            },
            isLateCheckout: false,
            isEarlyCheckin: false
          }
        ]
      };

      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(noCheckinData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('No next reservation')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple apartments', () => {
    it('should display multiple rows when there are multiple apartments', async () => {
      const multipleApartmentsData = {
        date: '2025-11-30',
        apartments: [
          {
            apartment: { _id: '1', name: 'Morača' },
            checkoutReservation: {
              _id: 'res1',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '11:00',
              guest: { fname: 'John', lname: 'Doe' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: { startTime: '11:00', endTime: '14:00', durationMinutes: 180, isCritical: false, isInvalid: false },
            isLateCheckout: false,
            isEarlyCheckin: false
          },
          {
            apartment: { _id: '2', name: 'Tara' },
            checkoutReservation: {
              _id: 'res2',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '12:00',
              guest: { fname: 'Jane', lname: 'Smith' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: { startTime: '12:00', endTime: '14:00', durationMinutes: 120, isCritical: false, isInvalid: false },
            isLateCheckout: true,
            isEarlyCheckin: false
          }
        ]
      };

      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue(multipleApartmentsData);

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Morača')).toBeInTheDocument();
        expect(screen.getByText('Tara')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Component structure', () => {
    it('should render Card component with header', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue({
        date: '2025-11-30',
        apartments: []
      });

      await act(async () => {
        render(<TomorrowCheckoutsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tomorrow's Checkouts - Cleaning Schedule/i)).toBeInTheDocument();
      });
    });

    it('should use table-responsive wrapper', async () => {
      cleaningOperations.getCheckoutTimelineDashboardData.mockResolvedValue({
        date: '2025-11-30',
        apartments: [
          {
            apartment: { _id: '1', name: 'Test' },
            checkoutReservation: {
              _id: 'res1',
              plannedCheckIn: '2025-11-29',
              plannedCheckOut: '2025-11-30',
              plannedCheckoutTime: '11:00',
              guest: { fname: 'A', lname: 'B' }
            },
            checkinReservation: null,
            scheduledCleanings: [],
            cleaningWindow: { startTime: '11:00', endTime: '14:00', durationMinutes: 180, isCritical: false, isInvalid: false },
            isLateCheckout: false,
            isEarlyCheckin: false
          }
        ]
      });

      let container;
      await act(async () => {
        const result = render(<TomorrowCheckoutsReport />);
        container = result.container;
      });

      await waitFor(() => {
        const tableResponsive = container.querySelector('.table-responsive');
        expect(tableResponsive).toBeInTheDocument();
      });
    });
  });
});
