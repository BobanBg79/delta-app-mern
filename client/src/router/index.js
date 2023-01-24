import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { PUBLIC_ROUTES, PROTECTED_ROUTES } from './routes';
import ProtectedRoute from './ProtectedRoute';
import PublicRoutes from './PublicRoute';

const RouterWrapper = () => {
  return (
    <Router>
      <Switch>
        {Object.entries(PUBLIC_ROUTES).map(([key, route]) => (
          // <Route key={key} exact path={route.path} component={route.component} />
          <PublicRoutes key={key} exact path={route.path} component={route.component} id={route.id} />
        ))}
        {Object.entries(PROTECTED_ROUTES).map(([key, route]) => (
          <ProtectedRoute key={key} exact={route.isExact} path={route.path} component={route.component} id={route.id} />
        ))}
        <Route path="/*" render={(props) => <Redirect to={{ pathname: '/', state: { from: props.location } }} />} />
      </Switch>
    </Router>
  );
};

export default RouterWrapper;
