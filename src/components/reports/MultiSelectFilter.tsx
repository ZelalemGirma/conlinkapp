import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selected,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full justify-between h-8 text-xs font-normal"
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : `${selected.length} selected`}
        </span>
        <div className="flex items-center gap-1 ml-1 shrink-0">
          {selected.length > 0 && (
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" onClick={clearAll} />
          )}
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </div>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border bg-popover shadow-md">
          <ScrollArea className="max-h-[250px]">
            <div className="p-1">
              {options.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={selected.includes(opt.value)}
                    onCheckedChange={() => toggle(opt.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.slice(0, 3).map(v => {
            const opt = options.find(o => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                {opt?.label ?? v}
                <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => toggle(v)} />
              </Badge>
            );
          })}
          {selected.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              +{selected.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
