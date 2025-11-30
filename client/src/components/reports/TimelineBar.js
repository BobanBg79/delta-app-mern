import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import './TimelineBar.css';

/**
 * TimelineBar component displays a visual timeline for a single apartment showing:
 * - Checkout time marker
 * - Cleaning window (time between checkout and next checkin)
 *
 * The timeline spans from 08:00 to 20:00 (12 hours)
 *
 * @param {Object} props
 * @param {Object} props.cleaningWindow - { startTime, endTime, durationMinutes, isCritical, isInvalid }
 * @param {boolean} props.isLateCheckout - Whether checkout is after 11:00
 */
const TimelineBar = ({ cleaningWindow, isLateCheckout }) => {
  if (!cleaningWindow) {
    return <div className="timeline-bar-container">No timeline data</div>;
  }

  const { startTime, endTime, durationFormatted, isCritical, isInvalid } = cleaningWindow;

  // Timeline configuration: 00:00 to 24:00 (24 hours = 1440 minutes)
  const TIMELINE_START = 0 * 60; // 00:00 (midnight) in minutes
  const TIMELINE_END = 24 * 60; // 24:00 (midnight) in minutes
  const TIMELINE_DURATION = TIMELINE_END - TIMELINE_START; // 1440 minutes

  // Helper: Convert "HH:MM" to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Calculate positions as percentages
  const checkoutMinutes = timeToMinutes(startTime);
  const checkinMinutes = timeToMinutes(endTime);

  // Position from left edge of timeline (as percentage)
  const checkoutPosition = ((checkoutMinutes - TIMELINE_START) / TIMELINE_DURATION) * 100;
  const checkinPosition = ((checkinMinutes - TIMELINE_START) / TIMELINE_DURATION) * 100;

  // Width of cleaning window bar
  const cleaningWindowWidth = checkinPosition - checkoutPosition;

  // Determine bar color based on criticality/validity
  let barClass = 'cleaning-window-bar';
  if (isInvalid) {
    barClass += ' invalid'; // Red - impossible (checkin before checkout)
  } else if (isCritical) {
    barClass += ' critical'; // Orange - less than 2 hours
  } else {
    barClass += ' normal'; // Green - sufficient time
  }

  // Calculate label positions (same formula as bars)
  const labelPositions = {
    '00:00': 0,
    '06:00': 25,
    '11:00': 45.833333,
    '12:00': 50,
    '14:00': 58.333333,
    '18:00': 75,
    '23:59': 99.930556,
  };

  return (
    <div className="timeline-bar-container">
      <div className="timeline-track">
        {/* Time axis labels */}
        <div className="timeline-labels">
          <span className="timeline-label" style={{ left: `${labelPositions['00:00']}%` }}>
            00:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['06:00']}%` }}>
            06:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['11:00']}%` }}>
            11:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['12:00']}%` }}>
            12:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['14:00']}%` }}>
            14:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['18:00']}%` }}>
            18:00
          </span>
          <span className="timeline-label" style={{ left: `${labelPositions['23:59']}%` }}>
            23:59
          </span>
        </div>

        {/* Cleaning window bar */}
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`cleaning-window-tooltip`}>
              <strong>Cleaning Window:</strong> {durationFormatted}
              <br />
              <strong>Time:</strong> {startTime} - {endTime}
            </Tooltip>
          }
        >
          <div
            className={barClass}
            style={{
              left: `${checkoutPosition}%`,
              width: `${cleaningWindowWidth}%`,
            }}
          >
            <span className="cleaning-window-label">
              {durationFormatted} ({startTime} - {endTime})
            </span>
          </div>
        </OverlayTrigger>

        {/* Checkout time marker */}
        {/* <div
          className={`checkout-marker ${isLateCheckout ? 'late' : 'normal'}`}
          style={{ left: `${checkoutPosition}%` }}
          title={`Checkout: ${startTime}`}
        >
          <div className="checkout-marker-line"></div>
          <div className="checkout-marker-label">{startTime}</div>
        </div> */}

        {/* Grid reference lines for all time labels */}
        <div className="grid-line" style={{ left: `${labelPositions['00:00']}%` }}></div>
        <div className="grid-line" style={{ left: `${labelPositions['06:00']}%` }}></div>
        <div
          className="grid-line default-time"
          style={{ left: `${labelPositions['11:00']}%` }}
          title="Default checkout: 11:00"
        ></div>
        <div className="grid-line" style={{ left: `${labelPositions['12:00']}%` }}></div>
        <div
          className="grid-line default-time"
          style={{ left: `${labelPositions['14:00']}%` }}
          title="Default checkin: 14:00"
        ></div>
        <div className="grid-line" style={{ left: `${labelPositions['18:00']}%` }}></div>
        <div className="grid-line" style={{ left: `${labelPositions['23:59']}%` }}></div>
      </div>
    </div>
  );
};

export default TimelineBar;
