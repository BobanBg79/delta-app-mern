import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const FormHeading = ({
  userHasPermissionToEditEntity,
  entityId,
  entity,
  entityLabel,
  isEditable,
  cancelEditing,
  makeFormEditable,
}) => {
  return (
    userHasPermissionToEditEntity && (
      <Row className="form-heading">
        <Col>
          <h1>{entityId ? entity && entity.name : `Create new ${entityLabel}`}</h1>
          {entityId && (
            <>
              {isEditable ? (
                <Button onClick={cancelEditing} variant="danger" className="mx-2">
                  Cancel
                </Button>
              ) : (
                <Button onClick={makeFormEditable}>Edit</Button>
              )}
            </>
          )}
        </Col>
      </Row>
    )
  );
};

export default FormHeading;
