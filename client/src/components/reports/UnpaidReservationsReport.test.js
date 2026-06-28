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

    it('should keep the table header (columns + filter) visible when empty', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() =>
        expect(screen.getByText(/no unpaid reservations for these filters/i)).toBeInTheDocument()
      );
      // header still rendered (column headers + apartment filter)
      expect(screen.getByText('Check-in')).toBeInTheDocument();
      expect(screen.getByLabelText(/apartment filter/i)).toBeInTheDocument();
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

    it('should show check-in and check-out in separate columns', async () => {
      // sampleReservation: check-in 01.06.2026, check-out 03.06.2026
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => {
        expect(screen.getByText('01.06.2026')).toBeInTheDocument();
      });
      expect(screen.getByText('03.06.2026')).toBeInTheDocument();
      // column headers present
      expect(screen.getByText('Check-in')).toBeInTheDocument();
      expect(screen.getByText('Check-out')).toBeInTheDocument();
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
    it('should request with fromDate = start of the current year by default', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const [url, config] = axios.get.mock.calls[0];
      expect(url).toBe('/api/reports/unpaid-reservations');
      const expected = new Date(new Date().getFullYear(), 0, 1).getTime();
      expect(config.params.fromDate).toBe(expected);
    });

    it('should show the default check-in chip on load', async () => {
      axios.get.mockResolvedValue({ data: { reservations: [] } });

      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText(/check-in:/i)).toBeInTheDocument());
    });
  });

  describe('Outstanding column filter', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { reservations: [sampleReservation], total: 1 } });
    });

    it('should refetch with minDiff/maxDiff only after Apply', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      axios.get.mockClear();

      // open the Outstanding dropdown
      fireEvent.click(screen.getByLabelText(/outstanding filter/i));
      const menu = screen.getByLabelText(/outstanding filter/i).closest('th').querySelector('.dropdown-menu');
      const [minInput, maxInput] = menu.querySelectorAll('input[type="number"]');
      fireEvent.change(minInput, { target: { value: '50' } });
      fireEvent.change(maxInput, { target: { value: '200' } });
      expect(axios.get).not.toHaveBeenCalled(); // draft only

      const applyBtn = [...menu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      const [, config] = axios.get.mock.calls[0];
      expect(config.params.minDiff).toBe('50');
      expect(config.params.maxDiff).toBe('200');
    });

    it('should show an Outstanding chip and remove it on x', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.click(screen.getByLabelText(/outstanding filter/i));
      const menu = screen.getByLabelText(/outstanding filter/i).closest('th').querySelector('.dropdown-menu');
      const [minInput] = menu.querySelectorAll('input[type="number"]');
      fireEvent.change(minInput, { target: { value: '50' } });
      const applyBtn = [...menu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      await waitFor(() => expect(screen.getByText(/Outstanding:/i)).toBeInTheDocument());

      axios.get.mockClear();
      await act(async () => {
        fireEvent.click(screen.getByLabelText(/remove outstanding filter/i));
      });
      const [, config] = axios.get.mock.calls[0];
      expect(config.params.minDiff).toBeUndefined();
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
      const jorgovan = screen.getByLabelText('Jorgovan');
      fireEvent.click(jorgovan);
      expect(axios.get).not.toHaveBeenCalled();

      // Apply (the one inside the apartment dropdown) -> single refetch
      const aptMenu = jorgovan.closest('.dropdown-menu');
      const applyBtn = [...aptMenu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
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
      const jorgovan = screen.getByLabelText('Jorgovan');
      fireEvent.click(jorgovan);
      const aptMenu = jorgovan.closest('.dropdown-menu');
      const applyBtn = [...aptMenu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
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

    it('should NOT show Clear all with only one active chip', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // remove the default check-in chip -> only filter left is none -> add one apartment
      await act(async () => {
        fireEvent.click(screen.getByLabelText(/remove check-in filter/i));
      });

      fireEvent.click(screen.getByLabelText(/apartment filter/i));
      const jorgovan = screen.getByLabelText('Jorgovan');
      fireEvent.click(jorgovan);
      const aptMenu = jorgovan.closest('.dropdown-menu');
      const applyBtn = [...aptMenu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      // exactly one chip (Apartment) -> no Clear all
      await waitFor(() => expect(screen.getByText(/Apartment: Jorgovan/i)).toBeInTheDocument());
      expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument();
    });

    it('should clear all filters (date + apartments) via Clear all', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // select an apartment so chips + Clear all are shown
      fireEvent.click(screen.getByLabelText(/apartment filter/i));
      const jorgovan = screen.getByLabelText('Jorgovan');
      fireEvent.click(jorgovan);
      const aptMenu = jorgovan.closest('.dropdown-menu');
      const applyBtn = [...aptMenu.querySelectorAll('button')].find((b) => b.textContent === 'Apply');
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      await waitFor(() => expect(screen.getByText(/clear all/i)).toBeInTheDocument());

      axios.get.mockClear();
      await act(async () => {
        fireEvent.click(screen.getByText(/clear all/i));
      });

      const [, config] = axios.get.mock.calls[0];
      expect(config.params.apartmentIds).toBeUndefined();
      expect(config.params.fromDate).toBeUndefined();
      expect(config.params.toDate).toBeUndefined();
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

    it('should not show the write-off button until a row is selected', async () => {
      await act(async () => {
        render(<UnpaidReservationsReport />);
      });

      await waitFor(() => expect(screen.getByText('Onyx')).toBeInTheDocument());
      // hidden with nothing selected
      expect(screen.queryByRole('button', { name: /write off selected/i })).not.toBeInTheDocument();

      // appears after selecting a row
      fireEvent.click(screen.getByLabelText(/select Onyx/i));
      expect(screen.getByRole('button', { name: /write off selected \(1\)/i })).toBeInTheDocument();
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

      // toggle off -> button disappears
      fireEvent.click(selectAll);
      expect(screen.queryByRole('button', { name: /write off selected/i })).not.toBeInTheDocument();
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
