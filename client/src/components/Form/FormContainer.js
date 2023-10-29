import { isValidElement, cloneElement, useState, useEffect, Children } from 'react';
import { useDispatch } from 'react-redux';
import { nestValue } from '../../utils/common';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const FormContainer = ({ formContainerProps, children }) => {
  const {
    userId,
    entity,
    entityName,
    entityModel,
    entityFetching: fetching,
    entityIdFromUrlParam,
    editEntityPermission,
    entityReduxActions,
    onEntityUpdateSuccess,
    onEntityCreateSuccess,
  } = formContainerProps;
  const dispatch = useDispatch();
  const { getEntity, createEntity, updateEntity, resetEntity } = entityReduxActions;

  // local state
  const [isEditable, setIsEditable] = useState(!entityIdFromUrlParam);
  const [formState, setFormState] = useState(entity || entityModel);
  const [validated, setValidated] = useState(false);

  // methods
  const makeFormEditable = () => !fetching && setIsEditable(true);

  const cancelEditing = () => {
    setFormState(entity);
    setIsEditable(false);
  };

  const onInputChange = (pathArr) => (event) => {
    const { value, checked } = event.target;
    const isCheckBox = event.target.type === 'checkbox';
    const fieldValue = isCheckBox ? checked : value;
    const newFormData = nestValue(formState, pathArr, fieldValue);
    setFormState(newFormData);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const formIsValid = event.currentTarget.checkValidity();
    if (formIsValid) {
      entityIdFromUrlParam
        ? dispatch(updateEntity(entityIdFromUrlParam, formState)).then(onEntityUpdateSuccess)
        : dispatch(createEntity({ ...formState, user: userId })).then(onEntityCreateSuccess);
    } else {
      setValidated(true);
    }
  };

  const childrenWithProps = Children.map(children, (child) => {
    // Checking isValidElement is the safe way and avoids a
    // typescript error too.
    if (isValidElement(child)) {
      return cloneElement(child, { formState, isEditable, validated, editEntityPermission, onInputChange, onSubmit });
    }
    return child;
  });

  // side effects
  useEffect(() => {
    entityIdFromUrlParam && dispatch(getEntity(entityIdFromUrlParam));
    return () => dispatch(resetEntity());
  }, [entityIdFromUrlParam, dispatch, getEntity, resetEntity]);
  useEffect(() => {
    entity && setFormState(entity);
  }, [entity]);
  useEffect(() => {
    fetching && setIsEditable(false);
  }, [fetching]);

  return (
    <div className="form-container">
      {editEntityPermission && (
        <Row className="form-heading">
          <Col>
            <h1>{entityIdFromUrlParam ? entity && entity.name : `Create new ${entityName}`}</h1>
            {entityIdFromUrlParam && (
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
      )}
      <Row>{childrenWithProps}</Row>
    </div>
  );
};

export default FormContainer;
