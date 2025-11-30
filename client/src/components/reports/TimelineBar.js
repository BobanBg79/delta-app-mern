import React from 'react';
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

  const { startTime, endTime, isCritical, isInvalid } = cleaningWindow;

  // Timeline configuration: 00:00 to 24:00 (24 hours = 1440 minutes)
  const TIMELINE_START = 0 * 60;  // 00:00 (midnight) in minutes
  const TIMELINE_END = 24 * 60;   // 24:00 (midnight) in minutes
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

  return (
    <div className="timeline-bar-container">
      <div className="timeline-track">
        {/* Time axis labels */}
        <div className="timeline-labels">
          <span className="timeline-label">00:00</span>
          <span className="timeline-label">06:00</span>
          <span className="timeline-label">11:00</span>
          <span className="timeline-label">14:00</span>
          <span className="timeline-label">18:00</span>
          <span className="timeline-label">23:59</span>
        </div>

        {/* Cleaning window bar */}
        <div
          className={barClass}
          style={{
            left: `${checkoutPosition}%`,
            width: `${cleaningWindowWidth}%`
          }}
        >
          <span className="cleaning-window-label">
            {startTime} - {endTime}
          </span>
        </div>

        {/* Checkout time marker */}
        <div
          className={`checkout-marker ${isLateCheckout ? 'late' : 'normal'}`}
          style={{ left: `${checkoutPosition}%` }}
          title={`Checkout: ${startTime}`}
        >
          <div className="checkout-marker-line"></div>
          <div className="checkout-marker-label">
            {startTime}
          </div>
        </div>

        {/* Default checkout time reference line (11:00) */}
        <div className="default-checkout-line" style={{ left: '45.83%' }} title="Default checkout: 11:00">
          <div className="default-line"></div>
        </div>

        {/* Default checkin time reference line (14:00) */}
        <div className="default-checkin-line" style={{ left: '58.33%' }} title="Default checkin: 14:00">
          <div className="default-line"></div>
        </div>
      </div>
    </div>
  );
};

export default TimelineBar;
