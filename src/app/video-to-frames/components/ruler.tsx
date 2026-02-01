import { ReactNode } from 'react';

interface RulerProps {
  width: number; // in mm
  height: number; // in mm
  unit: 'in' | 'cm';
  children: ReactNode;
}

export function Ruler({ width, height, unit, children }: RulerProps) {
  const mmToPixel = 3.7795275591; // at 96 DPI
  const widthPx = width * mmToPixel;
  const heightPx = height * mmToPixel;

  // Convert mm to display unit
  const convertMmToUnit = (mm: number): number => {
    if (unit === 'in') {
      return mm / 25.4; // 1 inch = 25.4mm
    }
    return mm / 10; // 1 cm = 10mm
  };

  const totalWidth = convertMmToUnit(width);
  const totalHeight = convertMmToUnit(height);

  // Determine tick spacing based on total size
  const getTickSpacing = (): { major: number; minor: number } => {
    if (unit === 'in') {
      return { major: 1, minor: 0.5 }; // 1 inch major, 0.5 inch minor
    } else {
      return { major: 1, minor: 0.5 }; // 1 cm major, 0.5 cm minor
    }
  };

  const { major, minor } = getTickSpacing();
  const rulerSize = 24; // px
  const fontSize = 10; // px

  // Generate tick marks
  const generateTicks = (length: number, isHorizontal: boolean) => {
    const ticks: JSX.Element[] = [];
    let position = 0;

    while (position <= length) {
      const isMajor = position % major === 0;
      const tickLength = isMajor ? rulerSize * 0.5 : rulerSize * 0.3;
      const positionPx = (position / length) * (isHorizontal ? widthPx : heightPx);

      ticks.push(
        <line
          key={`tick-${position}`}
          x1={isHorizontal ? positionPx : 0}
          y1={isHorizontal ? 0 : positionPx}
          x2={isHorizontal ? positionPx : tickLength}
          y2={isHorizontal ? tickLength : positionPx}
          stroke="var(--muted-foreground)"
          strokeWidth="1"
          opacity={isMajor ? '0.8' : '0.4'}
        />
      );

      // Add number labels for major ticks
      if (isMajor && position > 0) {
        const label = position.toString();
        ticks.push(
          <text
            key={`label-${position}`}
            x={isHorizontal ? positionPx : tickLength + 4}
            y={isHorizontal ? tickLength + fontSize + 2 : positionPx + 3}
            fontSize={fontSize}
            fill="var(--muted-foreground)"
            textAnchor={isHorizontal ? 'middle' : 'start'}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {label}
          </text>
        );
      }

      position += minor;
    }

    return ticks;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx + rulerSize,
        height: heightPx + rulerSize,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
      }}
    >
      {/* Horizontal ruler (top) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: rulerSize,
          width: widthPx,
          height: rulerSize,
          backgroundColor: 'var(--muted)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {generateTicks(totalWidth, true)}
        {/* Unit label */}
        <text
          x={4}
          y={fontSize + 4}
          fontSize={fontSize}
          fill="var(--muted-foreground)"
          fontWeight="600"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {unit}
        </text>
      </svg>

      {/* Vertical ruler (left) */}
      <svg
        style={{
          position: 'absolute',
          top: rulerSize,
          left: 0,
          width: rulerSize,
          height: heightPx,
          backgroundColor: 'var(--muted)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {generateTicks(totalHeight, false)}
        {/* Unit label (rotated) */}
        <text
          x={rulerSize - 6}
          y={heightPx - 4}
          fontSize={fontSize}
          fill="var(--muted-foreground)"
          fontWeight="600"
          textAnchor="end"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {unit}
        </text>
      </svg>

      {/* Corner square */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: rulerSize,
          height: rulerSize,
          backgroundColor: 'var(--muted)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2 2 L10 10 M2 10 L10 2"
            stroke="var(--muted-foreground)"
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Content area */}
      <div
        style={{
          position: 'absolute',
          top: rulerSize,
          left: rulerSize,
          width: widthPx,
          height: heightPx,
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}