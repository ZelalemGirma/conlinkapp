import React from 'react';
import { Button } from '@/components/ui/button';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';

interface DateRangePresetsProps {
  onSelect: (from: Date, to: Date) => void;
}

const DateRangePresets: React.FC<DateRangePresetsProps> = ({ onSelect }) => {
  const now = new Date();

  const presets = [
    {
      label: 'This Week',
      getRange: () => [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })] as [Date, Date],
    },
    {
      label: 'This Month',
      getRange: () => [startOfMonth(now), endOfMonth(now)] as [Date, Date],
    },
    {
      label: 'Last Month',
      getRange: () => {
        const last = subMonths(now, 1);
        return [startOfMonth(last), endOfMonth(last)] as [Date, Date];
      },
    },
    {
      label: 'Last Quarter',
      getRange: () => {
        const lastQ = subQuarters(now, 1);
        return [startOfQuarter(lastQ), endOfQuarter(lastQ)] as [Date, Date];
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map(p => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const [from, to] = p.getRange();
            onSelect(from, to);
          }}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
};

export default DateRangePresets;
