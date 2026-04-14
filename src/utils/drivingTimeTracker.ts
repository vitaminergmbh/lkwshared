import { DRIVING_TIME_LIMIT_MINUTES, REQUIRED_BREAK_MINUTES } from './constants';

export interface DrivingTimeResult {
  cumulativeDriveTime: number;
  breakNeededBefore: boolean;
}

export function calculateDrivingTime(
  prevCumulative: number,
  driveTimeThisSegment: number,
  prevStopWasBreak: boolean,
  prevStopStandingTime: number
): DrivingTimeResult {
  let baseCumulative = prevCumulative;

  if (prevStopWasBreak && prevStopStandingTime >= REQUIRED_BREAK_MINUTES) {
    baseCumulative = 0;
  }

  const cumulativeDriveTime = baseCumulative + driveTimeThisSegment;
  const breakNeededBefore = cumulativeDriveTime >= DRIVING_TIME_LIMIT_MINUTES;

  return {
    cumulativeDriveTime,
    breakNeededBefore,
  };
}

export function getDrivingTimeStatus(
  cumulativeMinutes: number
): 'ok' | 'warning' | 'exceeded' {
  if (cumulativeMinutes >= DRIVING_TIME_LIMIT_MINUTES) return 'exceeded';
  if (cumulativeMinutes >= DRIVING_TIME_LIMIT_MINUTES - 30) return 'warning';
  return 'ok';
}
