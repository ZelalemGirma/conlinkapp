import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLead } from '@/hooks/useLeads';
import { LEAD_CATEGORIES, LOCATION_ZONES } from '@/types';
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
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const leadFormSchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(200),
  contact_person: z.string().trim().max(100).default(''),
  position: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('Invalid email').max(255).or(z.literal('')).optional(),
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]),
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

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      company_name: '',
      contact_person: '',
      position: '',
      phone: '',
      email: '',
      specific_address: '',
      location_zone: '',
      campaign_tag: '',
    },
  });

  const onSubmit = async (values: LeadFormValues) => {
    await createLead.mutateAsync({
      company_name: values.company_name,
      contact_person: values.contact_person || '',
      position: values.position || '',
      phone: values.phone || '',
      email: values.email || '',
      category: values.category as any,
      specific_address: values.specific_address || '',
      location_zone: values.location_zone || '',
      gps_lat: typeof values.gps_lat === 'number' ? values.gps_lat : null,
      gps_lng: typeof values.gps_lng === 'number' ? values.gps_lng : null,
      campaign_tag: values.campaign_tag || '',
      status: 'draft',
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-secondary">New Lead Proposal</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
  );
};

export default LeadFormDialog;
