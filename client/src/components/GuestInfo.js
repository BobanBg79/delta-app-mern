import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tabs, Tab, Card, Table, Button, Form, FloatingLabel, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';
import { msgOperations, messageConstants } from '../modules/message';
import FormContainer from '../components/Form/FormContainer';
import GuestForm from '../pages/GuestView/GuestForm';
import GuestModel from '../pages/GuestView/GuestModel';
import { createGuest } from '../modules/guest/operations';
import { guestActions } from '../modules/guest';

const { SUCCESS, ERROR } = messageConstants;
const { showMessageToast } = msgOperations;

const GuestInfo = ({ formState, onBatchInputChange }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState(null);
  const [createdGuest, setCreatedGuest] = useState(null);

  const { user: { _id: userId } = {} } = useSelector((state) => state.auth);

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      dispatch(showMessageToast('Please enter at least 3 characters to search', ERROR));
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`/api/guests/search-by-phone/${searchTerm.trim()}`);
      setSearchResults(response.data.guests || []);
    } catch (error) {
      console.error('Error searching guests:', error);
      dispatch(showMessageToast('Error searching guests', ERROR));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Replace your current handleAssignGuest function with this:
  const handleAssignGuest = (guest) => {
    // Update the reservation form state with the selected guest ID
    const { _id: guestId, phoneNumber, firstName, lastName } = guest;

    // Use the new batch update function instead of multiple onInputChange calls
    onBatchInputChange([
      { path: ['guestId'], value: guestId },
      { path: ['phoneNumber'], value: phoneNumber },
      { path: ['firstName'], value: firstName },
      { path: ['lastName'], value: lastName },
    ]);

    setSelectedGuestId(guestId);
    dispatch(showMessageToast('Guest assigned to reservation successfully!', SUCCESS));
  };
  const handleGuestCreateSuccess = (newGuest) => {
    setCreatedGuest(newGuest);
    dispatch(showMessageToast('Guest created successfully!', SUCCESS));
  };

  const currentGuestId = formState?.guestId || selectedGuestId;

  // FormContainer props for guest creation
  const guestFormContainerProps = {
    userId,
    entity: null,
    entityName: 'guest',
    entityModel: GuestModel,
    entityFetching: false,
    entityIdFromUrlParam: null, // Always creating new guests
    editEntityPermission: true,
    entityReduxActions: {
      getEntity: () => Promise.resolve(),
      createEntity: createGuest,
      updateEntity: () => Promise.resolve(),
      resetEntity: guestActions.resetGuest,
    },
    onEntityUpdateSuccess: () => {},
    onEntityCreateSuccess: handleGuestCreateSuccess,
  };

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">Guest Information (Optional)</h6>
      </Card.Header>
      <Card.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          <Tab eventKey="search" title="Search Guest">
            <Row className="mb-3">
              <Col xs="8">
                <FloatingLabel controlId="guestSearch" label="Enter phone number" className="mb-3">
                  <Form.Control
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter phone number to search"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </FloatingLabel>
              </Col>
              <Col xs="4">
                <Button
                  variant="primary"
                  onClick={handleSearch}
                  disabled={isSearching || searchTerm.trim().length < 3}
                  className="h-100 w-100"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </Col>
            </Row>

            {searchResults.length > 0 && (
              <div>
                <h6>Search Results:</h6>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone Number</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((guest) => (
                      <tr key={guest._id} className={currentGuestId === guest._id ? 'table-success' : ''}>
                        <td>
                          {guest.firstName} {guest.lastName}
                        </td>
                        <td>{guest.phoneNumber}</td>
                        <td>
                          <Button
                            variant={currentGuestId === guest._id ? 'success' : 'outline-primary'}
                            size="sm"
                            onClick={() => handleAssignGuest(guest)}
                            disabled={currentGuestId === guest._id}
                          >
                            {currentGuestId === guest._id ? 'Assigned' : 'Assign Guest'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {searchTerm.trim().length >= 3 && searchResults.length === 0 && !isSearching && (
              <Alert variant="info">
                No guests found with phone number containing "{searchTerm}". You can create a new guest in the "Create
                New Guest" tab.
              </Alert>
            )}
          </Tab>

          <Tab eventKey="create" title="Create New Guest">
            <FormContainer formContainerProps={guestFormContainerProps}>
              <GuestForm />
            </FormContainer>

            {createdGuest && (
              <Alert variant="success" className="mt-3">
                <h6>Guest Created Successfully!</h6>
                <p>
                  <strong>Name:</strong> {createdGuest.firstName} {createdGuest.lastName}
                </p>
                <p>
                  <strong>Phone:</strong> {createdGuest.phoneNumber}
                </p>
                <Button
                  variant={currentGuestId === createdGuest._id ? 'success' : 'outline-success'}
                  size="sm"
                  onClick={() => handleAssignGuest(createdGuest._id)}
                  disabled={currentGuestId === createdGuest._id}
                >
                  {currentGuestId === createdGuest._id ? 'Assigned' : 'Assign Guest'}
                </Button>
              </Alert>
            )}
          </Tab>
        </Tabs>

        {currentGuestId && (
          <Alert variant="info">
            <strong>Guest assigned to this reservation.</strong> Guest ID: {currentGuestId}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default GuestInfo;
