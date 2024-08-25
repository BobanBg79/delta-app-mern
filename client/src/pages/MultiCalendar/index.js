import React from 'react';
import { StickyTable, Row, Cell } from 'react-sticky-table';
import MulticalendarApartmentRow from './MulticalendarApartmentRow';
import { useSelector } from 'react-redux';
import { getArrayOfConsecutiveDates, extractDateElements } from '../../utils/date';
import { RESERVATION_STATUSES } from '../../modules/reservation/constants';
import { MULTICALENDAR_ELEMENTS_DIMENSIONS } from './constants';
import TableHeader from '../../components/TableHeader';

const { dateCellWidth, apartmentNameCellWidth } = MULTICALENDAR_ELEMENTS_DIMENSIONS;
const initialRowOffset = dateCellWidth + apartmentNameCellWidth;

const MultiCalendar = () => {
  const { apartmentReservations } = useSelector((state) => state.reservation);
  const { apartments } = useSelector((state) => state.apartments);
  const startDate = new Date();
  const datesArray = getArrayOfConsecutiveDates(startDate, 30);
  return (
    <div>
      <TableHeader
        title="Multicalendar"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
      />
      <div className="multicalendar-table-container">
        <div style={{ width: '700px', height: '250px' }}>
          <StickyTable className="multicalendar-table">
            <Row className="dates-row">
              <Cell id="apartments-label" style={{ width: `${apartmentNameCellWidth}px !important` }}>
                Apartments
              </Cell>
              {datesArray.map((timestamp) => {
                const { dayOfWeekShort, dayOfTheMonth } = extractDateElements(timestamp);
                return (
                  <Cell key={timestamp} className="date-label-cell" style={{ width: `${dateCellWidth}px !important` }}>
                    <div className="date-label">
                      {dayOfWeekShort} <br /> {dayOfTheMonth}
                    </div>
                  </Cell>
                );
              })}
            </Row>
            {apartments.map((apartment) => {
              const reservations = apartmentReservations[apartment._id];
              const activeReservations = reservations?.filter(
                ({ reservationStatus }) => reservationStatus === RESERVATION_STATUSES.active
              );
              return (
                <MulticalendarApartmentRow
                  key={apartment._id}
                  apartmentName={apartment.name}
                  datesArray={datesArray}
                  calendarStartDate={startDate}
                  reservations={activeReservations}
                  initialRowOffset={initialRowOffset}
                />
              );
            })}
          </StickyTable>
        </div>
      </div>
    </div>
  );
};

export default MultiCalendar;
