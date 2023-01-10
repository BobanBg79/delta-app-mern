import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

const ProtectedRoute = ({ component: Component, id, token, loading, ...rest }) => (
  <Route
    {...rest}
    render={(props) => {
      if (!token) {
        return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
      }
      if (loading) {
        return (
          <div>
            <h1>Loading</h1>
          </div>
        );
      }
      return (
        <div id={id} className="page-wrapper">
          <Component {...props} />
        </div>
      );
    }}
  />
);

const mapState = (state) => {
  const { token, loading } = state.auth;
  return { token, loading };
};

export default connect(mapState)(ProtectedRoute);
