/**
 * Converts cron expressions to human-readable descriptions
 */

export function cronToHuman(cronExpression: string): string {
  if (!cronExpression || typeof cronExpression !== 'string') {
    console.log('cronToHuman: Invalid input:', cronExpression);
    return 'Invalid schedule';
  }

  const parts = cronExpression.trim().split(/\s+/);
  console.log('cronToHuman: Parsing cron:', cronExpression, 'Parts:', parts);
  
  // Standard cron has 5 parts: minute hour day month weekday
  if (parts.length !== 5) {
    console.log('cronToHuman: Invalid part count:', parts.length);
    return cronExpression; // Return original if not standard format
  }

  const [minute, hour, day, month, weekday] = parts;
  console.log('cronToHuman: Fields:', { minute, hour, day, month, weekday });

  // Helper function to parse number or range
  const parseNumber = (value: string): number | null => {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  };

  // Helper function to format time
  const formatTime = (hour: string, minute: string): string => {
    const h = parseNumber(hour);
    const m = parseNumber(minute);
    if (h === null || m === null) return '';
    
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const displayMinute = m.toString().padStart(2, '0');
    
    return `${displayHour}:${displayMinute} ${period}`;
  };

  // Handle specific patterns
  
  // Every minute: * * * * *
  if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every minute';
  }

  // Every X minutes: */X * * * *
  if (minute.startsWith('*/') && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    const interval = parseNumber(minute.substring(2));
    if (interval) {
      return `Every ${interval} minute${interval > 1 ? 's' : ''}`;
    }
  }

  // Every hour: 0 * * * *
  if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every hour';
  }

  // Every X hours: 0 */X * * *
  if (minute === '0' && hour.startsWith('*/') && day === '*' && month === '*' && weekday === '*') {
    const interval = parseNumber(hour.substring(2));
    if (interval) {
      return `Every ${interval} hour${interval > 1 ? 's' : ''}`;
    }
  }

  // Daily at specific time: M H * * *
  if (!minute.includes('*') && !hour.includes('*') && day === '*' && month === '*' && weekday === '*') {
    const time = formatTime(hour, minute);
    return time ? `Daily at ${time}` : 'Daily';
  }

  // Weekly patterns: M H * * D
  if (!minute.includes('*') && !hour.includes('*') && day === '*' && month === '*' && !weekday.includes('*')) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNum = parseNumber(weekday);
    const time = formatTime(hour, minute);
    
    if (dayNum !== null && dayNum >= 0 && dayNum <= 6) {
      const dayName = weekdays[dayNum];
      return time ? `Weekly on ${dayName} at ${time}` : `Weekly on ${dayName}`;
    }
  }

  // Monthly patterns: M H D * *
  if (!minute.includes('*') && !hour.includes('*') && !day.includes('*') && month === '*' && weekday === '*') {
    const dayNum = parseNumber(day);
    const time = formatTime(hour, minute);
    
    if (dayNum !== null) {
      const suffix = getDaysuffix(dayNum);
      return time ? `Monthly on the ${dayNum}${suffix} at ${time}` : `Monthly on the ${dayNum}${suffix}`;
    }
  }

  // Complex patterns with multiple values
  if (minute.includes(',') || hour.includes(',') || day.includes(',') || weekday.includes(',')) {
    return 'Custom schedule';
  }

  // Range patterns
  if (minute.includes('-') || hour.includes('-') || day.includes('-') || weekday.includes('-')) {
    return 'Custom schedule';
  }

  // Fallback for unrecognized patterns
  return 'Custom schedule';
}

function getDaysuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Validates if a cron expression is properly formatted
 */
export function isValidCron(cronExpression: string): boolean {
  if (!cronExpression || typeof cronExpression !== 'string') {
    return false;
  }

  const parts = cronExpression.trim().split(/\s+/);
  return parts.length === 5;
}

/**
 * Gets a more detailed description of a cron expression
 */
export function getCronDetails(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return 'Invalid cron format';
  }

  const [minute, hour, day, month, weekday] = parts;
  const details = [];

  if (minute !== '*') details.push(`Minute: ${minute}`);
  if (hour !== '*') details.push(`Hour: ${hour}`);
  if (day !== '*') details.push(`Day: ${day}`);
  if (month !== '*') details.push(`Month: ${month}`);
  if (weekday !== '*') details.push(`Weekday: ${weekday}`);

  return details.length > 0 ? details.join(', ') : 'Runs continuously';
} 