import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';

/**
 * Shared loading / error card state for homepage report components.
 * Renders a Bootstrap Card with either a centered spinner (loading) or an
 * error message. Returns null when neither loading nor error, so callers can do:
 *
 *   const state = <ReportCardState loading={loading} error={error} ... />;
 *   if (loading || error) return state;
 *
 * Props let each report keep its own loading text / spinner style.
 */
const ReportCardState = ({
  loading = false,
  error = null,
  loadingText = null,
  variant,
  size,
}) => {
  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" variant={variant} size={size}>
            <span className="visually-hidden">{loadingText || 'Loading...'}</span>
          </Spinner>
          {/* Visible text only when a report explicitly provides one */}
          {loadingText && <div className="mt-2 text-muted">{loadingText}</div>}
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 border-danger">
        <Card.Body>
          <Card.Title className="text-danger">Error</Card.Title>
          <p className="mb-0">{error}</p>
        </Card.Body>
      </Card>
    );
  }

  return null;
};

export default ReportCardState;
