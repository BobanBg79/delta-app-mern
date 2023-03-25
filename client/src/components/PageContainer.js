import MainNavigation from './MainNavigation';

const PageContainer = ({ children }) => {
  return (
    <div className="container">
      <MainNavigation />
      {children}
    </div>
  );
};

export default PageContainer;
