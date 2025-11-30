import axios from 'axios';
import bookingAgentsActions from './actions';

const { setBookingAgentsFetchStart, setBookingAgentsFetchEnd, setBookingAgents, setBookingAgentsError } =
  bookingAgentsActions;

export const getAllBookingAgents =
  (activeOnly = false) =>
  async (dispatch) => {
    try {
      dispatch(setBookingAgentsFetchStart());
      const queryParam = activeOnly ? '?active=true' : '';
      const response = await axios.get(`/api/booking-agents${queryParam}`);
      dispatch(setBookingAgents(response.data));
    } catch (error) {
      dispatch(setBookingAgentsError(error.message));
    } finally {
      dispatch(setBookingAgentsFetchEnd());
    }
  };

export const bookingAgentsOperations = {
  getAllBookingAgents,
};

export default bookingAgentsOperations;
