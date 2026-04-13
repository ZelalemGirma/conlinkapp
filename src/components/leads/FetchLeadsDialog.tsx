import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useFetchLeadsFromUrl } from '@/hooks/useSourcingQueue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FetchLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MERKATO_CATEGORIES = [
  { label: 'Building Material Suppliers', code: '1041' },
  { label: 'Building & Construction', code: '1001' },
  { label: 'Electrical & Electronics', code: '1006' },
  { label: 'Metal & Steel', code: '1024' },
  { label: 'Engineering Services', code: '1007' },
  { label: 'Real Estate & Property', code: '1034' },
  { label: 'Machinery & Equipment', code: '1021' },
  { label: 'Solar & Renewable Energy', code: '1036' },
  { label: 'Consulting Firms', code: '1005' },
  { label: 'Interior Design & Furniture', code: '1016' },
  { label: 'Transport & Logistics', code: '1043' },
  { label: 'Mining & Geological', code: '1025' },
];

const FetchLeadsDialog: React.FC<FetchLeadsDialogProps> = ({ open, onOpenChange }) => {
  const [url, setUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [quickFetchOpen, setQuickFetchOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fetchMutation = useFetchLeadsFromUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    await fetchMutation.mutateAsync(url.trim());
    setUrl('');
    onOpenChange(false);
  };

  const toggleCategory = (code: string) => {
    setSelectedCategories(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    if (selectedCategories.length === MERKATO_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(MERKATO_CATEGORIES.map(c => c.code));
    }
  };

  const handleBulkFetch = async () => {
    if (selectedCategories.length === 0) return;
    setProgress({ current: 0, total: selectedCategories.length });

    for (let i = 0; i < selectedCategories.length; i++) {
      const code = selectedCategories[i];
      const categoryUrl = `https://www.2merkato.com/directory/${code}/`;
      setProgress({ current: i + 1, total: selectedCategories.length });
      try {
        await fetchMutation.mutateAsync(categoryUrl);
      } catch {
        // continue with remaining categories
      }
    }

    setSelectedCategories([]);
    setProgress({ current: 0, total: 0 });
    onOpenChange(false);
  };

  const isBulkFetching = fetchMutation.isPending && progress.total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Fetch Leads from URL
          </DialogTitle>
        </DialogHeader>

        {/* Single URL */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter a URL to scrape, or use Quick Fetch below for 2merkato categories.
          </p>
          <Input
            type="url"
            placeholder="https://example.com/directory"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={isBulkFetching}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBulkFetching}>
              Cancel
            </Button>
            <Button type="submit" disabled={fetchMutation.isPending || !url.trim()}>
              {fetchMutation.isPending && progress.total === 0 ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</>
              ) : 'Fetch Leads'}
            </Button>
          </div>
        </form>

        {/* Quick Fetch: 2merkato */}
        <Collapsible open={quickFetchOpen} onOpenChange={setQuickFetchOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm font-medium" disabled={isBulkFetching}>
              Quick Fetch: 2merkato Categories
              {quickFetchOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Select categories to scrape from 2merkato.com</p>
              <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={selectAll}>
                {selectedCategories.length === MERKATO_CATEGORIES.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-48 rounded border p-2">
              <div className="space-y-2">
                {MERKATO_CATEGORIES.map(cat => (
                  <label key={cat.code} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-accent/50 rounded p-1">
                    <Checkbox
                      checked={selectedCategories.includes(cat.code)}
                      onCheckedChange={() => toggleCategory(cat.code)}
                    />
                    <span>{cat.label}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{cat.code}</Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>

            {isBulkFetching && (
              <div className="text-sm text-center text-muted-foreground">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Scraping category {progress.current} of {progress.total}...
              </div>
            )}

            <Button
              className="w-full"
              disabled={selectedCategories.length === 0 || fetchMutation.isPending}
              onClick={handleBulkFetch}
            >
              {isBulkFetching ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scraping {progress.current}/{progress.total}...</>
              ) : (
                `Fetch ${selectedCategories.length} Categor${selectedCategories.length === 1 ? 'y' : 'ies'}`
              )}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
};

export default FetchLeadsDialog;
