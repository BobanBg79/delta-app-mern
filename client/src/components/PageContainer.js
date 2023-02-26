import MainNavigation from './MainNavigation';

const PageContainer = ({ children, pageTitle }) => {
  return (
    <div className="container">
      <MainNavigation />
      <h1>{pageTitle}</h1>
      {children}
    </div>
  );
};

export default PageContainer;
