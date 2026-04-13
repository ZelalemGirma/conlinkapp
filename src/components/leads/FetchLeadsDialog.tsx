import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Loader2, ChevronDown, ChevronUp, Search, Star, ArrowRight, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useFetchLeadsFromUrl } from '@/hooks/useSourcingQueue';
import { useSearchLeads, useImportSearchResults, SearchLeadResult } from '@/hooks/useSearchLeads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface FetchLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_FETCH_SOURCES = [
  {
    name: '2merkato',
    label: '2merkato.com',
    baseUrl: 'https://www.2merkato.com/directory/',
    categories: [
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
    ],
  },
  {
    name: 'ethiobiz',
    label: 'Ethiobiz.com',
    baseUrl: 'https://www.ethiobiz.com/category/',
    categories: [
      { label: 'Construction & Building', code: 'construction-building' },
      { label: 'Engineering', code: 'engineering' },
      { label: 'Real Estate', code: 'real-estate' },
      { label: 'Manufacturing & Industry', code: 'manufacturing-industry' },
      { label: 'Mining & Minerals', code: 'mining-minerals' },
      { label: 'Electrical & Electronics', code: 'electrical-electronics' },
      { label: 'Transport & Logistics', code: 'transport-logistics' },
      { label: 'Consulting', code: 'consulting' },
      { label: 'Energy & Power', code: 'energy-power' },
      { label: 'Metal & Steel', code: 'metal-steel' },
    ],
  },
  {
    name: 'eccsa',
    label: 'Ethiopian Chamber (ECCSA)',
    baseUrl: 'https://www.ethiopianchamber.com/members/',
    categories: [
      { label: 'Construction Members', code: 'construction' },
      { label: 'Manufacturing Members', code: 'manufacturing' },
      { label: 'Engineering Members', code: 'engineering' },
      { label: 'Import/Export Members', code: 'import-export' },
      { label: 'Mining Members', code: 'mining' },
      { label: 'Real Estate Members', code: 'real-estate' },
    ],
  },
];

const PRIORITY_COLORS = {
  high: 'bg-success text-success-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

const FetchLeadsDialog: React.FC<FetchLeadsDialogProps> = ({ open, onOpenChange }) => {
  // URL fetch state
  const [url, setUrl] = useState('');
  // selectedCategories is keyed by source name, e.g. { '2merkato': ['1041','1001'], 'ethiobiz': ['construction-building'] }
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [quickFetchOpen, setQuickFetchOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fetchMutation = useFetchLeadsFromUrl();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchLeadResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());
  const [searchMeta, setSearchMeta] = useState<{ sources: string[]; detailPages: number } | null>(null);
  const searchMutation = useSearchLeads();
  const importMutation = useImportSearchResults();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    await fetchMutation.mutateAsync(url.trim());
    setUrl('');
    onOpenChange(false);
  };

  const toggleCategory = (sourceName: string, code: string) => {
    setSelectedCategories(prev => {
      const current = prev[sourceName] || [];
      const updated = current.includes(code)
        ? current.filter(c => c !== code)
        : [...current, code];
      return { ...prev, [sourceName]: updated };
    });
  };

  const selectAllForSource = (sourceName: string) => {
    const source = QUICK_FETCH_SOURCES.find(s => s.name === sourceName);
    if (!source) return;
    setSelectedCategories(prev => {
      const current = prev[sourceName] || [];
      if (current.length === source.categories.length) {
        return { ...prev, [sourceName]: [] };
      }
      return { ...prev, [sourceName]: source.categories.map(c => c.code) };
    });
  };

  const totalSelectedCount = Object.values(selectedCategories).reduce((sum, arr) => sum + arr.length, 0);

  const handleBulkFetch = async () => {
    // Build list of all URLs to fetch
    const urlsToFetch: string[] = [];
    for (const source of QUICK_FETCH_SOURCES) {
      const codes = selectedCategories[source.name] || [];
      for (const code of codes) {
        urlsToFetch.push(`${source.baseUrl}${code}/`);
      }
    }
    if (urlsToFetch.length === 0) return;
    setProgress({ current: 0, total: urlsToFetch.length });

    for (let i = 0; i < urlsToFetch.length; i++) {
      setProgress({ current: i + 1, total: urlsToFetch.length });
      try {
        await fetchMutation.mutateAsync(urlsToFetch[i]);
      } catch {
        // continue
      }
    }

    setSelectedCategories({});
    setProgress({ current: 0, total: 0 });
    onOpenChange(false);
  };

  // Search handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchResults([]);
    setSelectedResults(new Set());
    setSearchMeta(null);

    const result = await searchMutation.mutateAsync({ query: searchQuery.trim() });
    setSearchResults(result.leads);
    setSearchMeta({ sources: result.sources_searched, detailPages: result.detail_pages_fetched });

    // Auto-select high priority leads
    const highPriority = new Set<number>();
    result.leads.forEach((l, i) => {
      if (l.priority === 'high') highPriority.add(i);
    });
    setSelectedResults(highPriority);
  };

  const toggleResult = (idx: number) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllResults = () => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    const leadsToImport = searchResults.filter((_, i) => selectedResults.has(i));
    if (leadsToImport.length === 0) return;

    await importMutation.mutateAsync({ leads: leadsToImport, sourceQuery: searchQuery });
    setSearchResults([]);
    setSelectedResults(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  const isBulkFetching = fetchMutation.isPending && progress.total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Search & Import Leads
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              AI Search
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Fetch by URL
            </TabsTrigger>
          </TabsList>

          {/* AI Search Tab */}
          <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col space-y-3 mt-3">
            <form onSubmit={handleSearch} className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Search across Ethiopian directories, news, and business listings. AI automatically scores & categorizes results.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. steel supplier Addis Ababa, solar panel installer Ethiopia..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={searchMutation.isPending || importMutation.isPending}
                  className="flex-1"
                />
                <Button type="submit" disabled={searchMutation.isPending || !searchQuery.trim()} size="sm">
                  {searchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            {searchMutation.isPending && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="text-sm text-muted-foreground">
                  Crawling Ethiopian web sources & AI-scoring results...
                </div>
                <div className="text-xs text-muted-foreground">
                  Searching directories, news sites & business listings
                </div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                {/* Summary bar */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Found <strong>{searchResults.length}</strong> companies from{' '}
                    {searchMeta?.sources.join(', ')} ({searchMeta?.detailPages} pages crawled)
                  </span>
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={selectAllResults}>
                    {selectedResults.size === searchResults.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Results list */}
                <ScrollArea className="max-h-[40vh] rounded border">
                  <div className="divide-y">
                    {searchResults.map((lead, idx) => (
                      <label
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 cursor-pointer hover:bg-accent/30 transition-colors"
                      >
                        <Checkbox
                          checked={selectedResults.has(idx)}
                          onCheckedChange={() => toggleResult(idx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{lead.company_name}</span>
                            <Badge className={`text-[10px] shrink-0 ${PRIORITY_COLORS[lead.priority]}`}>
                              {lead.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-warning" />
                              {lead.relevance_score}/100
                            </span>
                            {lead.category && (
                              <Badge variant="outline" className="text-[10px]">{lead.category}</Badge>
                            )}
                            {lead.phone && <span>📞 {lead.phone}</span>}
                            {lead.email && <span>✉️ {lead.email}</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{lead.ai_reasoning}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                {/* Import button */}
                <Button
                  onClick={handleImport}
                  disabled={selectedResults.size === 0 || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Import {selectedResults.size} Lead{selectedResults.size !== 1 ? 's' : ''} to Vetting Queue
                    </>
                  )}
                </Button>
              </div>
            )}

            {!searchMutation.isPending && searchResults.length === 0 && searchMeta && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No results found. Try a different search term.
              </div>
            )}
          </TabsContent>

          {/* URL Fetch Tab */}
          <TabsContent value="url" className="space-y-3 mt-3">
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
                  <div className="space-y-2">
                    <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                    <div className="text-sm text-center text-muted-foreground">
                      Scraping category {progress.current} of {progress.total}...
                    </div>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FetchLeadsDialog;
