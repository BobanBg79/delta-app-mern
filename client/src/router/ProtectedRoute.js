import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

const ProtectedRoute = ({ component: Component, token, loading, ...rest }) => (
  <Route
    {...rest}
    render={(props) => {
      console.log(11111, props);
      if (!token) {
        debugger;
        return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
      }
      if (loading) {
        return (
          <div>
            <h1>Loading</h1>
          </div>
        );
      }
      return <Component {...props} />;
    }}
  />
);

const mapState = (state) => {
  const { token, loading } = state.auth;
  return { token, loading };
};

export default connect(mapState)(ProtectedRoute);
