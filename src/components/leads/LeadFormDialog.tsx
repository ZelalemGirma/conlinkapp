import React, { useState } from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLead } from '@/hooks/useLeads';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { LEAD_CATEGORIES, LOCATION_ZONES, LEAD_SOURCES } from '@/types';
import DuplicateWarning from '@/components/leads/DuplicateWarning';
import CameraScanDialog from '@/components/leads/CameraScanDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Loader2, Camera, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const leadFormSchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(200),
  contact_person: z.string().trim().max(100).default(''),
  position: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  extra_phones: z.array(z.object({ value: z.string().trim().max(20) })).max(4).default([]),
  email: z.string().trim().email('Invalid email').max(255).or(z.literal('')).optional(),
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]),
  source: z.string().optional(),
  specific_address: z.string().trim().max(500).optional(),
  location_zone: z.string().optional(),
  gps_lat: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  gps_lng: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  campaign_tag: z.string().trim().max(50).optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadFormDialog: React.FC<LeadFormDialogProps> = ({ open, onOpenChange }) => {
  const createLead = useCreateLead();
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      company_name: '',
      contact_person: '',
      position: '',
      phone: '',
      extra_phones: [],
      email: '',
      source: '',
      specific_address: '',
      location_zone: '',
      campaign_tag: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'extra_phones',
  });

  const watchedCompany = useWatch({ control: form.control, name: 'company_name' }) || '';
  const watchedPhone = useWatch({ control: form.control, name: 'phone' }) || '';
  const { data: duplicates } = useDuplicateCheck(watchedCompany, watchedPhone);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('gps_lat', position.coords.latitude);
        form.setValue('gps_lng', position.coords.longitude);
        setCapturingLocation(false);
        toast.success('Location captured');
      },
      (error) => {
        setCapturingLocation(false);
        toast.error('Failed to get location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOCRResult = (data: { company_name?: string; contact_person?: string; phone?: string; email?: string }) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.contact_person) form.setValue('contact_person', data.contact_person);
    if (data.phone) form.setValue('phone', data.phone);
    if (data.email) form.setValue('email', data.email);
  };

  const onSubmit = async (values: LeadFormValues) => {
    const phoneNumbers = [values.phone, ...values.extra_phones.map(p => p.value)].filter(Boolean) as string[];
    await createLead.mutateAsync({
      company_name: values.company_name,
      contact_person: values.contact_person || '',
      position: values.position || '',
      phone: values.phone || '',
      email: values.email || '',
      category: values.category as any,
      source: values.source || '',
      specific_address: values.specific_address || '',
      location_zone: values.location_zone || '',
      gps_lat: typeof values.gps_lat === 'number' ? values.gps_lat : null,
      gps_lng: typeof values.gps_lng === 'number' ? values.gps_lng : null,
      campaign_tag: values.campaign_tag || '',
      phone_numbers: phoneNumbers,
      status: 'draft',
    });
    form.reset();
    onOpenChange(false);
  };

  const canAddPhone = fields.length < 4;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-secondary flex items-center justify-between">
              <span>New Lead Proposal</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(true)} className="gap-1.5">
                <Camera className="h-4 w-4" /> Scan Card
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                {duplicates && duplicates.length > 0 && (
                  <DuplicateWarning duplicates={duplicates} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl><Input placeholder="Enter company name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl><Input placeholder="Job title" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Primary phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="+251..." type="tel" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="email@company.com" type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Extra phone numbers */}
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`extra_phones.${index}.value`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="flex items-center justify-between">
                            Phone {index + 2}
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => remove(index)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </FormLabel>
                          <FormControl><Input placeholder="+251..." type="tel" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  {canAddPhone && (
                    <div className="flex items-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Another Phone
                      </Button>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LEAD_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => {
                      const isOther = field.value === '__other__' || (field.value && !LEAD_SOURCES.includes(field.value as any));
                      return (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              if (v === '__other__') {
                                field.onChange('');
                                setShowOtherSource(true);
                              } else {
                                field.onChange(v);
                                setShowOtherSource(false);
                              }
                            }}
                            value={showOtherSource ? '__other__' : field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEAD_SOURCES.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                              <SelectItem value="__other__">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {showOtherSource && (
                            <Input
                              placeholder="Type source..."
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="mt-2"
                            />
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="specific_address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Specific Address</FormLabel>
                        <FormControl><Textarea placeholder="Detailed address..." rows={2} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_zone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Zone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATION_ZONES.map(zone => (
                              <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="campaign_tag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Tag</FormLabel>
                        <FormControl><Input placeholder="e.g. Edition 13" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={captureLocation}
                      disabled={capturingLocation}
                      className="gap-1.5"
                    >
                      {capturingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4 text-primary" />
                      )}
                      {capturingLocation ? 'Capturing…' : 'Capture Current Location'}
                    </Button>
                    <span className="text-xs text-muted-foreground">or enter manually below</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="gps_lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPS Latitude</FormLabel>
                        <FormControl><Input placeholder="e.g. 9.0192" type="number" step="any" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gps_lng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPS Longitude</FormLabel>
                        <FormControl><Input placeholder="e.g. 38.7525" type="number" step="any" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLead.isPending}>
                    {createLead.isPending ? 'Submitting...' : 'Submit Lead'}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CameraScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleOCRResult} />
    </>
  );
};

export default LeadFormDialog;
