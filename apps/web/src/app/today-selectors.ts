import {
  CALCULATION_BLOCKER_CODES,
  type CalculationBlockerCode,
  type CalculationWarningCode,
  type DailyTimeAttention,
  type TodayAttendance,
  type TodayAttentionItem,
} from '@workledger/contracts';

const blockerCodes = new Set<string>(CALCULATION_BLOCKER_CODES);

export function selectTodayAttention(today: TodayAttendance): DailyTimeAttention {
  const blockers: CalculationBlockerCode[] = [];
  const warnings: CalculationWarningCode[] = [];
  for (const item of today.calculation.attentionItems) {
    if (isBlockerItem(item)) blockers.push(item.code);
    else if (isWarningItem(item)) warnings.push(item.code);
  }
  return { blockers, warnings };
}

function isWarningItem(
  item: TodayAttentionItem,
): item is TodayAttentionItem & Readonly<{ code: CalculationWarningCode; severity: 'WARNING' }> {
  return item.severity === 'WARNING' && !blockerCodes.has(item.code);
}

function isBlockerItem(
  item: TodayAttentionItem,
): item is TodayAttentionItem & Readonly<{ code: CalculationBlockerCode; severity: 'BLOCKER' }> {
  return item.severity === 'BLOCKER' && blockerCodes.has(item.code);
}
