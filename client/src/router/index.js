import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { PUBLIC_ROUTES, PROTECTED_ROUTES } from './routes';
import ProtectedRoute from './ProtectedRoute';

const RouterWrapper = () => {
  return (
    <Router>
      <div className="container">
        <Switch>
          {Object.entries(PUBLIC_ROUTES).map(([key, route]) => (
            <Route key={key} exact path={route.path} component={route.component} />
          ))}

          {Object.entries(PROTECTED_ROUTES).map(([key, route]) => (
            <ProtectedRoute key={key} exact path={route.path} component={route.component} />
          ))}
        </Switch>
      </div>
    </Router>
  );
};

export default RouterWrapper;
