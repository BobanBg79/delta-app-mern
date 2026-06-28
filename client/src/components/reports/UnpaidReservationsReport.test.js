import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import axios from 'axios';
import UnpaidReservationsReport from './UnpaidReservationsReport';

// Mock axios with a factory so Jest never loads the real ESM build
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// Mock react-redux. By default the auth user has the write-off permission so
// the selection UI renders; individual tests can override mockAuthUser.
let mockAuthUser = { role: { permissions: ['CAN_WRITE_OFF_RESERVATION'] } };
let mockApartments = [];
const mockDispatch = jest.fn((action) => action);
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (fn) =>
    fn({ apartments: { apartments: mockApartments }, auth: { user: mockAuthUser } }),
}));

// Mock react-router-dom's useHistory
const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockHistoryPush }),
}));

// Mock the batch write-off thunk
jest.mock('../../modules/reservation/operations', () => ({
  batchWriteOff: jest.fn(() => ({ type: 'MOCK_BATCH_WRITE_OFF' })),
}));
// eslint-disable-next-line import/first
import { batchWriteOff } from '../../modules/reservation/operations';

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
    mockAuthUser = { role: { permissions: ['CAN_WRITE_OFF_RESERVATION'] } };
    mockApartments = [];
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
      // The component logs the error in its catch block; silence that expected
      // console.error so it doesn't clutter the test output.
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockRejectedValue(new Error('boom'));

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load unpaid reservations/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Empty state', () => {
    it('should show a settled message when there are no unpaid reservations', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText(/no unpaid reservations for these filters/i)).toBeInTheDocument();
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

    it('should show the year once when check-in and check-out are the same year', async () => {
      // sampleReservation: 01.06.2026 - 03.06.2026
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('01.06. - 03.06.2026')).toBeInTheDocument();
      });
    });

    it('should show both years for a cross-year reservation', async () => {
      axios.get.mockResolvedValue({
        data: {
          reservations: [
            {
              ...sampleReservation,
              plannedCheckIn: '2025-12-28T00:00:00.000Z',
              plannedCheckOut: '2026-01-02T00:00:00.000Z',
            },
          ],
        },
      });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('28.12.2025 - 02.01.2026')).toBeInTheDocument();
      });
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

  describe('Apartment column filter', () => {
    beforeEach(() => {
      mockApartments = [
        { _id: 'apt-1', name: 'Onyx' },
        { _id: 'apt-2', name: 'Jorgovan' },
      ];
      axios.get.mockResolvedValue({ data: { reservations: [sampleReservation], total: 1 } });
    });

    it('should refetch with apartmentIds only after Apply (not on each check)', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      axios.get.mockClear();

      // open dropdown and check an apartment — should NOT refetch yet
      fireEvent.click(screen.getByLabelText(/apartment filter/i));
      fireEvent.click(screen.getByLabelText('Jorgovan'));
      expect(axios.get).not.toHaveBeenCalled();

      // Apply -> single refetch with the selection
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply/i }));
      });

      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      const [, config] = axios.get.mock.calls[0];
      expect(config.params.apartmentIds).toBe('apt-2');
      expect(config.params.page).toBe(0);
    });

    it('should show a chip after Apply and remove it immediately on x', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.click(screen.getByLabelText(/apartment filter/i));
      fireEvent.click(screen.getByLabelText('Jorgovan'));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /apply/i }));
      });

      // chip appears
      await waitFor(() =>
        expect(screen.getByText(/Apartment: Jorgovan/i)).toBeInTheDocument()
      );

      axios.get.mockClear();
      // remove via the chip x — applies immediately
      await act(async () => {
        fireEvent.click(screen.getByLabelText(/remove Jorgovan filter/i));
      });

      const [, config] = axios.get.mock.calls[0];
      expect(config.params.apartmentIds).toBeUndefined();
    });
  });

  describe('Batch write-off', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { reservations: [sampleReservation], total: 1 } });
    });

    it('should NOT show selection UI without the write-off permission', async () => {
      mockAuthUser = { role: { permissions: [] } };

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());
      expect(screen.queryByText(/write off selected/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/select Onyx/i)).not.toBeInTheDocument();
    });

    it('should disable the write-off button until a row is selected', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /write off selected/i })).toBeDisabled();
    });

    it('should open a confirmation modal and dispatch batchWriteOff on confirm', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());

      // select the row
      fireEvent.click(screen.getByLabelText(/select Onyx/i));
      // open confirmation
      fireEvent.click(screen.getByRole('button', { name: /write off selected/i }));

      expect(screen.getByText(/about to write off the debt/i)).toBeInTheDocument();

      // confirm
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /confirm write-off/i }));
      });

      expect(batchWriteOff).toHaveBeenCalledWith(['res-1']);
    });

    it('should select and unselect all rows on the page via the header checkbox', async () => {
      axios.get.mockResolvedValue({
        data: {
          reservations: [
            { ...sampleReservation, _id: 'res-1', apartmentName: 'Onyx' },
            { ...sampleReservation, _id: 'res-2', apartmentName: 'Jorgovan' },
          ],
          total: 2,
        },
      });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());

      const selectAll = screen.getByLabelText(/select all on this page/i);
      fireEvent.click(selectAll);

      // both row checkboxes checked -> button shows count 2
      expect(screen.getByRole('button', { name: /write off selected \(2\)/i })).toBeInTheDocument();

      // toggle off
      fireEvent.click(selectAll);
      expect(screen.getByRole('button', { name: /write off selected \(0\)/i })).toBeDisabled();
    });

    it('should not dispatch when the modal is cancelled', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());
      fireEvent.click(screen.getByLabelText(/select Onyx/i));
      fireEvent.click(screen.getByRole('button', { name: /write off selected/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(batchWriteOff).not.toHaveBeenCalled();
    });
  });
});
