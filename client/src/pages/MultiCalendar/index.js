import React, { useState, useEffect, useMemo } from 'react';
import { StickyTable, Row, Cell } from 'react-sticky-table';
import { useHistory } from 'react-router-dom';
import MulticalendarApartmentRow from './MulticalendarApartmentRow';
import { useSelector, useDispatch } from 'react-redux';
import { getArrayOfConsecutiveDates, extractDateElements, isToday } from '../../utils/date';
import { RESERVATION_STATUSES } from '../../modules/reservation/constants';
import { MULTICALENDAR_ELEMENTS_DIMENSIONS } from './constants';
import TableHeader from '../../components/TableHeader';
import { getReservationsInDateRange } from '../../modules/reservation/operations';
import ReservationQuickView from '../../components/ReservationQuickView';

const { dateCellWidth, apartmentNameCellWidth } = MULTICALENDAR_ELEMENTS_DIMENSIONS;
const initialRowOffset = dateCellWidth + apartmentNameCellWidth;

const MultiCalendar = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { reservations } = useSelector((state) => state.reservation);
  const { apartments } = useSelector((state) => state.apartments);
  const [tableRendered, setTableRendered] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Use useMemo to memoize date objects
  // Start 2 days before today, show 30 days into the future (32 days total)
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 2); // Start 2 days before today
    const end = new Date();
    end.setDate(today.getDate() + 30); // End 30 days in the future
    return { startDate: start, endDate: end };
  }, []);

  const { startDate, endDate } = dateRange;

  // Memoize the dates array (32 days total: 2 before + today + 29 more = 32 days)
  const datesArray = useMemo(() => getArrayOfConsecutiveDates(startDate, 32), [startDate]);

  // Fetch reservations within the date range when component mounts
  useEffect(() => {
    dispatch(getReservationsInDateRange(startDate, endDate));
  }, [dispatch, startDate, endDate]);

  // Wait for table to render before showing reservations
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableRendered(true);
    }, 100); // Small delay to ensure table is rendered

    return () => clearTimeout(timer);
  }, [apartments, datesArray]);

  // Filter reservations by apartment and date range
  const getReservationsForApartment = (apartmentId) => {
    if (!reservations || !Array.isArray(reservations)) return [];

    return reservations.filter((reservation) => {
      // Only active reservations
      if (reservation.status !== RESERVATION_STATUSES.active) return false;

      // Must belong to this apartment
      const reservationApartmentId = reservation.apartment?._id || reservation.apartment;
      if (reservationApartmentId !== apartmentId) return false;

      // Check if reservation overlaps with our 30-day window
      const checkIn = new Date(reservation.plannedCheckIn);
      const checkOut = new Date(reservation.plannedCheckOut);

      // Reservation overlaps if:
      // - Check-in is before our window ends AND
      // - Check-out is after our window starts
      return checkIn <= endDate && checkOut >= startDate;
    });
  };

  const handleReservationClick = (reservation) => {
    setSelectedReservation(reservation);
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
  };

  const handleViewDetails = () => {
    if (selectedReservation) {
      history.push(`/reservations/${selectedReservation._id}`);
      setSelectedReservation(null);
    }
  };

  return (
    <div>
      <TableHeader
        title="Multicalendar"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
      />
      <div className="multicalendar-table-container">
        <div style={{ width: '100%', minWidth: '800px', height: 'auto', minHeight: '300px' }}>
          <StickyTable className="multicalendar-table">
            <Row className="dates-row">
              <Cell id="apartments-label" style={{ width: `${apartmentNameCellWidth}px` }}>
                Apartments
              </Cell>
              {datesArray.map((timestamp) => {
                const { dayOfWeekShort, dayOfTheMonth } = extractDateElements(timestamp);
                return (
                  <Cell
                    key={timestamp}
                    className="date-label-cell"
                    style={{
                      width: `${dateCellWidth}px`,
                      backgroundColor: isToday(timestamp) ? '#d4edda' : 'transparent',
                    }}
                  >
                    <div className="date-label">
                      {dayOfWeekShort} <br /> {dayOfTheMonth}
                    </div>
                  </Cell>
                );
              })}
            </Row>
            {apartments
              .slice() // Create a shallow copy to avoid mutating the original array
              .sort((a, b) => {
                // Primary sort: alphabetically by apartment name
                const nameCompare = a.name.localeCompare(b.name);
                if (nameCompare !== 0) return nameCompare;
                
                // Secondary sort: by _id for stable ordering if names are identical
                return a._id.localeCompare(b._id);
              })
              .map((apartment) => {
                const apartmentReservations = getReservationsForApartment(apartment._id);

                return (
                  <MulticalendarApartmentRow
                    key={apartment._id}
                    apartmentName={apartment.name}
                    datesArray={datesArray}
                    calendarStartDate={startDate}
                    calendarEndDate={endDate}
                    reservations={tableRendered ? apartmentReservations : []} // Only show reservations after table renders
                    initialRowOffset={initialRowOffset}
                    tableRendered={tableRendered}
                    onReservationClick={handleReservationClick}
                  />
                );
              })}
          </StickyTable>
        </div>
      </div>

      {selectedReservation && (
        <ReservationQuickView
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
};

export default MultiCalendar;
