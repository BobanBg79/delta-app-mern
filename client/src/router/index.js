import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { PUBLIC_ROUTES, PROTECTED_ROUTES } from './routes';
import ProtectedRoute from './ProtectedRoute';
import PublicRoutes from './PublicRoute';
import PageContainer from '../components/PageContainer';

const RouterWrapper = () => {
  return (
    <Router>
      <Switch>
        {Object.entries(PUBLIC_ROUTES).map(([key, route]) => (
          <PublicRoutes key={key} exact path={route.path} component={route.component} id={route.id} />
        ))}
        <PageContainer>
          <Switch>
            {Object.entries(PROTECTED_ROUTES).map(([key, route]) => (
              <ProtectedRoute
                key={key}
                exact={route.isExact}
                path={route.path}
                component={route.component}
                id={route.id}
                adminOnly={route.adminOnly}
              />
            ))}
          </Switch>
        </PageContainer>
        <Route path="/*" render={(props) => <Redirect to={{ pathname: '/', state: { from: props.location } }} />} />
      </Switch>
    </Router>
  );
};

export default RouterWrapper;
