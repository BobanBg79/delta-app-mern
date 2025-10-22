import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useDispatch } from 'react-redux';
import { deleteApartment } from '../modules/apartment/operations';
import { getAllApartments } from '../modules/apartments/operations';

const ConfirmationModal = ({ closeModal, apartmentId }) => {
  const dispatch = useDispatch();
  const onDelete = () =>
    dispatch(deleteApartment(apartmentId)).then(() => {
      dispatch(getAllApartments());
      closeModal();
    });

  return (
    <Modal show={true} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Deactivate apartment</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        This will set the apartment status to inactive. The apartment will not be deleted and all reservations will remain intact.
        <div>Are you sure you want to deactivate this apartment?</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={closeModal}>
          Cancel
        </Button>
        <Button variant="warning" onClick={onDelete}>
          Deactivate apartment
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;
