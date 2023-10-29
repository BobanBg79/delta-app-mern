import MainNavigation from './MainNavigation';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAllApartments } from '../modules/apartments/operations';

const PageContainer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllApartments());
  }, [dispatch]);

  return (
    <div className="container">
      <MainNavigation />
      {children}
    </div>
  );
};

export default PageContainer;
