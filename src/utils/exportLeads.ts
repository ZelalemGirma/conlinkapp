import { LEAD_STATUS_CONFIG } from '@/types';
import type { Database } from '@/integrations/supabase/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export const exportLeadsCSV = (leads: LeadRow[]) => {
  const headers = ['Company', 'Contact', 'Position', 'Phone', 'Email', 'Category', 'Zone', 'Status', 'Campaign', 'Address', 'Created'];
  const rows = leads.map(l => [
    l.company_name,
    l.contact_person,
    l.position || '',
    l.phone || '',
    l.email || '',
    l.category,
    l.location_zone || '',
    LEAD_STATUS_CONFIG[l.status]?.label || l.status,
    l.campaign_tag || '',
    l.specific_address || '',
    new Date(l.created_at).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportLeadsPDF = (leads: LeadRow[]) => {
  const printContent = `
    <html><head><title>Leads Export</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #1A2E44; font-size: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
      th { background: #1A2E44; color: white; padding: 8px 6px; text-align: left; }
      td { padding: 6px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f9f9f9; }
      .meta { color: #666; font-size: 12px; margin-bottom: 8px; }
    </style></head><body>
    <h1>Conlink CRM – Leads Export</h1>
    <p class="meta">${leads.length} leads • Exported ${new Date().toLocaleString()}</p>
    <table>
      <thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Category</th><th>Zone</th><th>Status</th></tr></thead>
      <tbody>
        ${leads.map(l => `<tr>
          <td>${l.company_name}</td>
          <td>${l.contact_person}</td>
          <td>${l.phone || '—'}</td>
          <td>${l.category}</td>
          <td>${l.location_zone || '—'}</td>
          <td>${LEAD_STATUS_CONFIG[l.status]?.label || l.status}</td>
        </tr>`).join('')}
      </tbody>
    </table></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(printContent);
    win.document.close();
    win.print();
  }
};
