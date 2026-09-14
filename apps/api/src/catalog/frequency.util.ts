import { ContributionFrequency } from "@bingmoney/shared";

/** Adds `count` intervals of `frequency` to `date`. Months use calendar
 * arithmetic (not a fixed 30 days) so due dates land on sensible days. */
export function addIntervals(date: Date, frequency: ContributionFrequency, count: number): Date {
  const result = new Date(date);
  switch (frequency) {
    case ContributionFrequency.WEEKLY:
      result.setDate(result.getDate() + 7 * count);
      break;
    case ContributionFrequency.BIWEEKLY:
      result.setDate(result.getDate() + 14 * count);
      break;
    case ContributionFrequency.MONTHLY:
      result.setMonth(result.getMonth() + count);
      break;
  }
  return result;
}
