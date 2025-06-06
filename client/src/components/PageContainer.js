import MainNavigation from './MainNavigation';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAllApartments } from '../modules/apartments/operations';
import { getAllBookingAgents } from '../modules/bookingAgents/operations';

const PageContainer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load initial data needed throughout the app
    dispatch(getAllApartments());
    dispatch(getAllBookingAgents(true)); // Load active booking agents
  }, [dispatch]);

  return (
    <div className="container">
      <MainNavigation />
      {children}
    </div>
  );
};

export default PageContainer;
