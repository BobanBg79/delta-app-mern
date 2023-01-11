import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const PublicRoute = ({ component: Component, id, token, loading, ...rest }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return (
    <Route
      {...rest}
      render={(props) => {
        if (isAuthenticated) {
          return <Redirect to={{ pathname: '/', state: { from: props.location } }} />;
        }
        if (loading) {
          return (
            <Row>
              <Col xs md="6" className="mx-auto">
                <h1>Loading</h1>
              </Col>
            </Row>
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
};

const mapState = (state) => {
  const { token, loading } = state.auth;
  return { token, loading };
};

export default connect(mapState)(PublicRoute);
