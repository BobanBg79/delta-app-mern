import { Row, Cell } from 'react-sticky-table';
import { formatDateDefault, getDifferenceInDays } from '../../utils/date';
import { MULTICALENDAR_ELEMENTS_DIMENSIONS } from './constants';

const { dateCellWidth, apartmentNameCellWidth } = MULTICALENDAR_ELEMENTS_DIMENSIONS;

const MulticalendarApartmentRow = ({
  apartmentName,
  datesArray,
  calendarStartDate,
  reservations,
  initialRowOffset,
}) => {
  return (
    <Row id={apartmentName} className="apartment-row">
      <Cell className="cell apartment-name-cell">
        <div className="apartment-name">{apartmentName}</div>
      </Cell>

      {datesArray.map((timestamp) => (
        <Cell key={`${apartmentName}-${timestamp}`} className="cell date-cell" />
      ))}
      {reservations?.map((reservation) => {
        const { checkIn, checkOut } = reservation;
        const dayDiffBetweenCalendarStartDateAndCheckInDate = getDifferenceInDays(calendarStartDate.getTime(), checkIn);
        const reservationLength = getDifferenceInDays(checkIn, checkOut);
        const leftPosition = initialRowOffset + dayDiffBetweenCalendarStartDateAndCheckInDate * dateCellWidth;
        const reservationDisplayWidth = reservationLength * dateCellWidth;
        return (
          <div
            key={checkIn}
            className={`reservation ${apartmentName}-reservation`}
            style={{ left: leftPosition, width: reservationDisplayWidth }}
          >
            <span>{formatDateDefault(checkIn)}</span> -<span>{formatDateDefault(checkOut)}</span>
          </div>
        );
      })}
    </Row>
  );
};

export default MulticalendarApartmentRow;
