import { render, screen } from '@testing-library/react';
import TimelineBar from './TimelineBar';

describe('TimelineBar Component', () => {
  describe('No data scenario', () => {
    it('should display "No timeline data" when cleaningWindow is null', () => {
      render(<TimelineBar cleaningWindow={null} isLateCheckout={false} />);
      expect(screen.getByText('No timeline data')).toBeInTheDocument();
    });

    it('should display "No timeline data" when cleaningWindow is undefined', () => {
      render(<TimelineBar cleaningWindow={undefined} isLateCheckout={false} />);
      expect(screen.getByText('No timeline data')).toBeInTheDocument();
    });
  });

  describe('Timeline axis labels', () => {
    const mockCleaningWindow = {
      startTime: '10:00',
      endTime: '13:00',
      durationMinutes: 180,
      durationFormatted: '3h',
      isCritical: false,
      isInvalid: false
    };

    it('should display all time axis labels', () => {
      const { container } = render(<TimelineBar cleaningWindow={mockCleaningWindow} isLateCheckout={false} />);

      const timelineLabels = container.querySelector('.timeline-labels');
      expect(timelineLabels).toBeInTheDocument();

      // Check that timeline labels container has all 7 time labels
      const labels = timelineLabels.querySelectorAll('.timeline-label');
      expect(labels).toHaveLength(7);
      expect(labels[0].textContent).toBe('00:00');
      expect(labels[1].textContent).toBe('06:00');
      expect(labels[2].textContent).toBe('11:00');
      expect(labels[3].textContent).toBe('12:00');
      expect(labels[4].textContent).toBe('14:00');
      expect(labels[5].textContent).toBe('18:00');
      expect(labels[6].textContent).toBe('23:59');
    });
  });

  describe('Normal cleaning window', () => {
    it('should render normal cleaning window (11:00 - 14:00)', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '14:00',
        durationMinutes: 180,
        durationFormatted: '3h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.normal');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('3h (11:00 - 14:00)')).toBeInTheDocument();
    });

  });

  describe('Critical cleaning window (< 2 hours)', () => {
    it('should render critical cleaning window with orange bar', () => {
      const cleaningWindow = {
        startTime: '12:00',
        endTime: '13:30',
        durationMinutes: 90,
        durationFormatted: '1h 30min',
        isCritical: true,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.critical');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('1h 30min (12:00 - 13:30)')).toBeInTheDocument();
    });
  });

  describe('Invalid cleaning window (checkin before checkout)', () => {
    it('should render invalid cleaning window with red bar', () => {
      const cleaningWindow = {
        startTime: '14:00',
        endTime: '12:00',
        durationMinutes: -120,
        durationFormatted: '2h',
        isCritical: false,
        isInvalid: true
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.invalid');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('2h (14:00 - 12:00)')).toBeInTheDocument();
    });
  });

  describe('Late checkout scenario', () => {
    it('should render late checkout with critical window', () => {
      const cleaningWindow = {
        startTime: '12:30',
        endTime: '14:00',
        durationMinutes: 90,
        durationFormatted: '1h 30min',
        isCritical: true,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={true} />
      );

      const bar = container.querySelector('.cleaning-window-bar.critical');

      expect(bar).toBeInTheDocument();
      expect(screen.getByText('1h 30min (12:30 - 14:00)')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should render very short cleaning window (30 minutes)', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '11:30',
        durationMinutes: 30,
        durationFormatted: '30 min',
        isCritical: true,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.critical');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('30 min (11:00 - 11:30)')).toBeInTheDocument();
    });

    it('should render long cleaning window (6 hours)', () => {
      const cleaningWindow = {
        startTime: '10:00',
        endTime: '16:00',
        durationMinutes: 360,
        durationFormatted: '6h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.normal');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('6h (10:00 - 16:00)')).toBeInTheDocument();
    });

    it('should render early checkout (09:00)', () => {
      const cleaningWindow = {
        startTime: '09:00',
        endTime: '14:00',
        durationMinutes: 300,
        durationFormatted: '5h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.normal');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('5h (09:00 - 14:00)')).toBeInTheDocument();
    });

    it('should render late evening checkin (18:00)', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '18:00',
        durationMinutes: 420,
        durationFormatted: '7h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar.normal');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('7h (11:00 - 18:00)')).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('should render timeline track container', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '14:00',
        durationMinutes: 180,
        durationFormatted: '3h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      expect(container.querySelector('.timeline-bar-container')).toBeInTheDocument();
      expect(container.querySelector('.timeline-track')).toBeInTheDocument();
    });

    it('should render grid reference lines', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '14:00',
        durationMinutes: 180,
        durationFormatted: '3h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      // Should have 7 grid lines (one for each time label)
      const gridLines = container.querySelectorAll('.grid-line');
      expect(gridLines).toHaveLength(7);

      // Should have 2 default-time lines (11:00 and 14:00)
      const defaultTimeLines = container.querySelectorAll('.grid-line.default-time');
      expect(defaultTimeLines).toHaveLength(2);
    });
  });

  describe('Positioning calculations', () => {
    it('should position cleaning window bar correctly in the DOM', () => {
      const cleaningWindow = {
        startTime: '11:00',
        endTime: '14:00',
        durationMinutes: 180,
        durationFormatted: '3h',
        isCritical: false,
        isInvalid: false
      };

      const { container } = render(
        <TimelineBar cleaningWindow={cleaningWindow} isLateCheckout={false} />
      );

      const bar = container.querySelector('.cleaning-window-bar');
      expect(bar).toBeInTheDocument();
      // Check inline styles (positioning)
      // Timeline: 00:00-24:00 (1440 minutes)
      // 11:00 = 660/1440 * 100 = 45.83%
      // 14:00 = 840/1440 * 100 = 58.33%
      // width = 58.33% - 45.83% = 12.5%
      expect(bar.style.left).toBe('45.83333333333333%');
      expect(bar.style.width).toBe('12.500000000000007%');
    });
  });
});
