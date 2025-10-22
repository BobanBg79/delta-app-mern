import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { hasPermission } from '../utils/permissions';

const ProtectedRoute = ({ component: Component, id, token, loading, user, requiredPermission, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        if (!token) {
          return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
        }
        
        // Check if user has required permission
        const userPermissions = user?.role?.permissions || [];
        if (!hasPermission(userPermissions, requiredPermission)) {
          return <Redirect to={{ pathname: '/', state: { from: props.location } }} />;
        }

        return loading ? (
          <Row>
            <Col xs md="6" className="mx-auto">
              <h1>Loading</h1>
            </Col>
          </Row>
        ) : (
          <div id={id} className="page-wrapper">
            <Component {...props} />
          </div>
        );
      }}
    />
  );
};

const mapState = (state) => {
  const { token, loading, user } = state.auth;
  return { token, loading, user };
};

export default connect(mapState)(ProtectedRoute);
