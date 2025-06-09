import { Row, Cell } from 'react-sticky-table';
import { formatDateDefault, getDifferenceInDays } from '../../utils/date';
import { MULTICALENDAR_ELEMENTS_DIMENSIONS } from './constants';

const { dateCellWidth } = MULTICALENDAR_ELEMENTS_DIMENSIONS;

const MulticalendarApartmentRow = ({
  apartmentName,
  datesArray,
  calendarStartDate,
  calendarEndDate,
  reservations,
  initialRowOffset,
}) => {
  const calculateReservationDisplay = (reservation) => {
    const checkIn = new Date(reservation.plannedCheckIn);
    const checkOut = new Date(reservation.plannedCheckOut);

    // Clamp dates to our calendar window
    const displayStartDate = checkIn < calendarStartDate ? calendarStartDate : checkIn;
    const displayEndDate = checkOut > calendarEndDate ? calendarEndDate : checkOut;

    // Calculate position from calendar start
    const dayOffsetFromStart = getDifferenceInDays(calendarStartDate.getTime(), displayStartDate.getTime());
    const displayLengthInDays = getDifferenceInDays(displayStartDate.getTime(), displayEndDate.getTime());

    // Ensure we show at least 1 day width
    const widthInDays = Math.max(1, displayLengthInDays);

    const leftPosition = initialRowOffset + dayOffsetFromStart * dateCellWidth;
    const width = widthInDays * dateCellWidth;

    return {
      leftPosition,
      width,
      displayStartDate,
      displayEndDate,
      isPartial: checkIn < calendarStartDate || checkOut > calendarEndDate,
    };
  };

  return (
    <Row id={`apartment-${apartmentName}`} className="apartment-row">
      <Cell className="cell apartment-name-cell">
        <div className="apartment-name">{apartmentName}</div>
      </Cell>

      {datesArray.map((timestamp) => (
        <Cell key={`${apartmentName}-${timestamp}`} className="cell date-cell" />
      ))}

      {reservations?.map((reservation, index) => {
        const display = calculateReservationDisplay(reservation);
        const reservationKey = `${reservation._id || index}-${reservation.plannedCheckIn}`;

        return (
          <div
            key={reservationKey}
            className={`reservation ${apartmentName}-reservation ${display.isPartial ? 'partial-reservation' : ''}`}
            style={{
              left: display.leftPosition,
              width: display.width,
              minWidth: `${dateCellWidth - 2}px`, // Ensure minimum visibility
            }}
            title={`${formatDateDefault(reservation.plannedCheckIn)} - ${formatDateDefault(
              reservation.plannedCheckOut
            )}`}
          >
            <span className="reservation-dates">
              {display.isPartial && <span className="partial-indicator">...</span>}
              {formatDateDefault(display.displayStartDate)} - {formatDateDefault(display.displayEndDate)}
              {display.isPartial && <span className="partial-indicator">...</span>}
            </span>
          </div>
        );
      })}
    </Row>
  );
};

export default MulticalendarApartmentRow;
