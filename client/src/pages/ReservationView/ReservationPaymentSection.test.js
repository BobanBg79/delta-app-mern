import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ReservationPaymentSection from './ReservationPaymentSection';
import { getPaymentsByReservation } from '../../modules/payment/operations';
import { setDebtWriteOff } from '../../modules/reservation/operations';

jest.mock('../../modules/payment/operations', () => ({
  getPaymentsByReservation: jest.fn(),
}));

jest.mock('../../modules/reservation/operations', () => ({
  setDebtWriteOff: jest.fn(() => ({ type: 'MOCK_WRITE_OFF' })),
}));

// dispatch just invokes the (mocked) thunk
const mockDispatch = jest.fn((action) => action);
let mockAuthUser;
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (fn) => fn({ auth: { user: mockAuthUser } }),
}));

// Stub the child status component to keep this test focused
jest.mock('../../components/ReservationPaymentStatus', () => () => <div data-testid="payment-status" />);
jest.mock('../../components/PaymentForm', () => () => <div data-testid="payment-form" />);

const WRITE_OFF_PERMISSION = 'CAN_WRITE_OFF_RESERVATION';

const withPermission = (perm) => ({
  role: { permissions: perm ? [perm] : [] },
});

const baseReservation = { _id: 'res-1', totalAmount: 100, debtWrittenOff: false };

const renderSection = (reservation = baseReservation) =>
  act(async () => {
    render(<ReservationPaymentSection formState={reservation} isEditable={false} />);
  });

describe('ReservationPaymentSection - write-off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPaymentsByReservation.mockResolvedValue({ totalPaid: 0, payments: [] });
  });

  it('should NOT show the write-off button without the permission', async () => {
    mockAuthUser = withPermission(null);

    await renderSection();

    await waitFor(() => expect(screen.getByText('Add Payment')).toBeInTheDocument());
    expect(screen.queryByText(/write off debt/i)).not.toBeInTheDocument();
  });

  it('should show the write-off button with the permission', async () => {
    mockAuthUser = withPermission(WRITE_OFF_PERMISSION);

    await renderSection();

    await waitFor(() => expect(screen.getByText(/write off debt/i)).toBeInTheDocument());
  });

  it('should dispatch setDebtWriteOff(true) when clicking Write off debt', async () => {
    mockAuthUser = withPermission(WRITE_OFF_PERMISSION);

    await renderSection();

    await waitFor(() => expect(screen.getByText(/write off debt/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/write off debt/i));

    expect(setDebtWriteOff).toHaveBeenCalledWith('res-1', true);
  });

  it('should show the badge and an Undo button when debt is written off', async () => {
    mockAuthUser = withPermission(WRITE_OFF_PERMISSION);

    await renderSection({ ...baseReservation, debtWrittenOff: true });

    await waitFor(() => expect(screen.getByText('Debt written off')).toBeInTheDocument());
    const undo = screen.getByText(/undo write-off/i);
    fireEvent.click(undo);
    expect(setDebtWriteOff).toHaveBeenCalledWith('res-1', false);
  });
});
