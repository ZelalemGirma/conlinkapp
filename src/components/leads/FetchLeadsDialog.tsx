import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Loader2 } from 'lucide-react';
import { useFetchLeadsFromUrl } from '@/hooks/useSourcingQueue';

interface FetchLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FetchLeadsDialog: React.FC<FetchLeadsDialogProps> = ({ open, onOpenChange }) => {
  const [url, setUrl] = useState('');
  const fetchMutation = useFetchLeadsFromUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    await fetchMutation.mutateAsync(url.trim());
    setUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Fetch Leads from URL
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a website URL to scrape for company names, phone numbers, and emails. Results go to the Vetting Queue for review.
          </p>
          <Input
            type="url"
            placeholder="https://example.com/directory"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={fetchMutation.isPending || !url.trim()}>
              {fetchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Leads'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FetchLeadsDialog;
