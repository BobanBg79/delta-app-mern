import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import axios from 'axios';
import UnpaidReservationsReport from './UnpaidReservationsReport';

// Mock axios with a factory so Jest never loads the real ESM build
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// Mock react-router-dom's useHistory
const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockHistoryPush }),
}));

const sampleReservation = {
  _id: 'res-1',
  apartmentName: 'Onyx',
  plannedCheckIn: '2026-06-01T00:00:00.000Z',
  plannedCheckOut: '2026-06-03T00:00:00.000Z',
  bookingAgentName: 'Direct Reservation',
  phoneNumber: '0601234567',
  totalAmount: 100,
  totalPaid: 40,
  diff: 60,
};

describe('UnpaidReservationsReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show a spinner while loading', () => {
      axios.get.mockImplementation(() => new Promise(() => {})); // never resolves

      render(<UnpaidReservationsReport />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show an error message when the request fails', async () => {
      axios.get.mockRejectedValue(new Error('boom'));

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load unpaid reservations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should show a settled message when there are no unpaid reservations', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/no unpaid reservations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data state', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { reservations: [sampleReservation] } });
    });

    it('should render the reservation apartment and agent/contact', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Onyx')).toBeInTheDocument();
      });
      expect(screen.getByText(/Direct Reservation/)).toBeInTheDocument();
      expect(screen.getByText(/0601234567/)).toBeInTheDocument();
    });

    it('should navigate to the reservation details when a row is clicked', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('Onyx')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Onyx'));

      expect(mockHistoryPush).toHaveBeenCalledWith('/reservations/res-1');
    });
  });

  describe('Request window', () => {
    it('should request with a fromDate ~12 months in the past', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const [url, config] = axios.get.mock.calls[0];
      expect(url).toBe('/api/reports/unpaid-reservations');
      expect(config.params.fromDate).toEqual(expect.any(Number));

      // fromDate should be roughly one year ago (allow a wide margin)
      const aboutOneYearMs = 365 * 24 * 60 * 60 * 1000;
      const delta = Date.now() - config.params.fromDate;
      expect(delta).toBeGreaterThan(aboutOneYearMs - 5 * 24 * 60 * 60 * 1000);
      expect(delta).toBeLessThan(aboutOneYearMs + 5 * 24 * 60 * 60 * 1000);
    });
  });
});
