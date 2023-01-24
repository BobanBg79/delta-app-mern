import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import PageContainer from '../components/PageContainer';

const ProtectedRoute = ({ component: Component, id, token, loading, ...rest }) => (
  <Route
    {...rest}
    render={(props) => {
      if (!token) {
        return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />;
      }

      return (
        <PageContainer>
          {loading ? (
            <Row>
              <Col xs md="6" className="mx-auto">
                <h1>Loading</h1>
              </Col>
            </Row>
          ) : (
            <div id={id} className="page-wrapper">
              <Component {...props} />
            </div>
          )}
        </PageContainer>
      );
    }}
  />
);

const mapState = (state) => {
  const { token, loading } = state.auth;
  return { token, loading };
};

export default connect(mapState)(ProtectedRoute);
