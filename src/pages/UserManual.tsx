import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Rocket, LayoutDashboard, ClipboardList, BarChart3, Map,
  Target, Trophy, Users, FileBarChart, Settings, Bell, Search,
  AlertTriangle, CheckCircle, HelpCircle, ArrowRight, Lightbulb,
  Phone, Mail, Calendar, Camera, Shield, Brain, Zap
} from 'lucide-react';

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

const StepCard = ({ step, title, description }: { step: number; title: string; description: string }) => (
  <div className="flex gap-4 items-start">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
      {step}
    </div>
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, badge }: { icon: React.ElementType; title: string; description: string; badge?: string }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-4 w-4 text-secondary-foreground" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm">{title}</p>
            {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const UserManual = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Conlink CRM — User Manual</h1>
        </div>
        <p className="text-muted-foreground">
          Your complete guide to managing leads, tracking performance, and closing deals in the construction industry.
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="guide">Guide Book</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        {/* ───── GETTING STARTED ───── */}
        <TabsContent value="getting-started" className="space-y-8">
          <Section icon={Rocket} title="Getting Started">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Welcome to Conlink CRM</CardTitle>
                <CardDescription>Follow these steps to get up and running in minutes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <StepCard step={1} title="Sign In" description="Use the credentials provided by your administrator. Enter your email and password on the login screen. If you're a new user, your admin will create your account." />
                <StepCard step={2} title="Explore the Dashboard" description="After logging in, you'll land on the Dashboard — your command center showing KPIs, team performance charts, and the motivation board." />
                <StepCard step={3} title="Add Your First Lead" description="Navigate to the Leads page, click 'Add Lead', and fill in the company details, contact info, category, and location zone." />
                <StepCard step={4} title="Log Interactions" description="Open any lead and use the Interaction Log panel to record calls, emails, site visits, Telegram messages, and meetings." />
                <StepCard step={5} title="Track Progress" description="Use the Pipeline view for a Kanban-style overview, the Map View for spatial intelligence, and the Reports page for deep analytics." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Understanding Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Admin</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Full access: manage users, settings, targets, and all data. Can approve/reject leads and view all reports.</p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Manager</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Oversee team performance, approve leads, set targets, and access team-wide reports and leaderboards.</p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Rep</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Create leads, log interactions, view personal targets, and track your own performance on the leaderboard.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>
        </TabsContent>

        {/* ───── GUIDE BOOK ───── */}
        <TabsContent value="guide" className="space-y-8">
          <Section icon={Lightbulb} title="Guide Book">
            <p className="text-sm text-muted-foreground">Step-by-step workflows for common tasks.</p>
          </Section>

          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="leads" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> Managing Leads</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p><strong>Creating a Lead:</strong> Go to <em>Leads → Add Lead</em>. Fill in company name, contact person, phone, category (e.g., Building Materials, Solar Technology), and location zone (e.g., Bole, Kirkos). You can also scan a business card using the camera icon.</p>
                <p><strong>Editing a Lead:</strong> Click any lead row to open its detail dialog. Edit fields inline and save changes.</p>
                <p><strong>Status Workflow:</strong> Leads progress through statuses: <em>Draft → Pending → Approved → Meeting Scheduled → Profile Sent → Deal Closed</em>. Negative outcomes include Rejected (Phone), Rejected (Spot), Wrong Number, Not Reachable, and Company Closed.</p>
                <p><strong>Duplicate Detection:</strong> The system automatically checks for duplicates by company name and phone number. If a match is found, you'll see a warning before saving.</p>
                <p><strong>Merging Leads:</strong> Admins/Managers can merge duplicate leads, combining interaction histories into a single record.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="interactions" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4 text-primary" /> Logging Interactions</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p><strong>Types:</strong> Phone calls, Emails, Telegram messages, Site Visits, and Meetings.</p>
                <p><strong>Best Practices:</strong> Write detailed notes. The AI analysis engine scores your notes — "Discussed electrical specifications, scheduled follow-up for Tuesday" scores much higher than "called him".</p>
                <p><strong>AI Scoring:</strong> Each interaction is analyzed for sentiment, effort, and quality. High-quality interactions earn better scores on the leaderboard.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pipeline" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" /> Using the Pipeline</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p>The Pipeline view shows leads organized by status in a Kanban-style board. Each column represents a status stage. View counts at the top of each column to quickly assess your workflow distribution.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="map" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Map className="h-4 w-4 text-primary" /> Map View & Hotspots</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p><strong>Color-Coded Pins:</strong> Orange = Meeting Scheduled, Navy Blue = Deal Closed / Approved, Red Glow = Needs Follow-up, Gray = Other statuses.</p>
                <p><strong>Heatmap:</strong> Toggle the heatmap layer to see high-density lead clusters. Brighter areas indicate more active markets.</p>
                <p><strong>Clustering:</strong> Zoom out to see grouped pins (e.g., "15 Leads in Kirkos"). Click a cluster to zoom in.</p>
                <p><strong>Quick Actions:</strong> Click any pin to see company details, then use "Navigate" to open Google Maps directions or "Call" to dial directly.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><FileBarChart className="h-4 w-4 text-primary" /> Reports & Analytics</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p><strong>Date Presets:</strong> Quickly filter by This Week, This Month, or Last Quarter using the preset buttons.</p>
                <p><strong>Multi-Select Filters:</strong> Filter by multiple statuses, categories, or reps simultaneously to compare specific groups.</p>
                <p><strong>KPI Cards:</strong> Total Leads, Conversion Rate, Avg. Approval Time, and Activity Volume update in real-time as you adjust filters.</p>
                <p><strong>Conversion Funnel:</strong> Visualize drop-off rates from New Lead → Approved → Contacted → Deal Closed.</p>
                <p><strong>Export:</strong> Download filtered data as CSV for external analysis.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="targets" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" /> Targets & Leaderboard</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                <p><strong>Setting Targets:</strong> Admins/Managers set targets for leads, calls, meetings, and conversions per rep per period.</p>
                <p><strong>Leaderboard:</strong> Rankings are based on lead count, conversion rate, and AI-scored interaction quality. Filter by campaign, category, status, or location zone to find the "King of Bole" or "King of Kirkos".</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ───── FEATURES ───── */}
        <TabsContent value="features" className="space-y-8">
          <Section icon={Zap} title="Feature Overview">
            <p className="text-sm text-muted-foreground">All the tools built into Conlink CRM.</p>
          </Section>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Core Modules</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard icon={LayoutDashboard} title="Dashboard" description="Real-time KPI cards, team performance charts, status distribution pie chart, and motivation board with golden spotlight control." />
              <FeatureCard icon={ClipboardList} title="Lead Management" description="Full CRUD with 16 construction categories, 14 status types, duplicate detection, lead merging, business card scanning via camera, and CSV export." />
              <FeatureCard icon={BarChart3} title="Pipeline View" description="Kanban-style board showing leads organized by status stage with drag-and-drop-style navigation." />
              <FeatureCard icon={Map} title="Map View" description="Interactive map with color-coded pins, heatmap layer, pin clustering, zone filtering, and Google Maps navigation integration." badge="Spatial" />
              <FeatureCard icon={FileBarChart} title="Reports & Analytics" description="Multi-select filters, date range presets, conversion funnel, activity volume chart, rep success table, and real-time KPI updates." />
              <FeatureCard icon={Trophy} title="Leaderboard" description="AI-powered rankings with filtering by campaign, category, status, and location zone. Identifies top performers per area." />
              <FeatureCard icon={Target} title="Sales Targets" description="Set and track targets for leads, calls, meetings, and conversions per rep with progress visualization." />
              <FeatureCard icon={Users} title="Team Management" description="View team members, roles, and performance. Admins can manage user accounts and permissions." />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI & Automation</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard icon={Brain} title="AI Interaction Analysis" description="Automatically scores interaction notes for sentiment, effort, and quality. Distinguishes detailed site visits from lazy one-liners." badge="AI" />
              <FeatureCard icon={Search} title="Duplicate Detection" description="Fuzzy matching on company name and phone number prevents redundant entries. Flags repeated attempts by the same rep." />
              <FeatureCard icon={Camera} title="Business Card Scanner" description="Use your device camera to scan business cards. OCR extracts company name, contact person, phone, and email automatically." />
              <FeatureCard icon={Bell} title="Smart Notifications" description="Real-time alerts for lead approvals, follow-up reminders, meeting schedules, and system updates." />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Administration</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard icon={Settings} title="App Settings" description="Configure system-wide settings, golden spotlight parameters, and application preferences." badge="Admin" />
              <FeatureCard icon={Shield} title="User Management" description="Create accounts, assign roles (Admin/Manager/Rep), activate or deactivate users." badge="Admin" />
            </div>
          </div>
        </TabsContent>

        {/* ───── TROUBLESHOOTING ───── */}
        <TabsContent value="troubleshooting" className="space-y-8">
          <Section icon={AlertTriangle} title="Troubleshooting">
            <p className="text-sm text-muted-foreground">Common issues and how to resolve them.</p>
          </Section>

          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="login" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> I can't log in</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• Verify you're using the correct email and password provided by your administrator.</p>
                <p>• Check if your account has been deactivated — contact your admin to confirm.</p>
                <p>• Clear your browser cache and cookies, then try again.</p>
                <p>• If using Google Sign-In, ensure your Google account email matches the one registered in the system.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leads-not-showing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> My leads aren't showing</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• As a Rep, you can only see leads assigned to you or created by you.</p>
                <p>• Check if any filters are active on the Leads page — clear all filters to see the full list.</p>
                <p>• If you have more than 1,000 leads, use search or filters to narrow results.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="map-empty" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> Map shows no pins</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• Pins are placed based on the lead's Location Zone. Ensure leads have a zone assigned.</p>
                <p>• Check if a zone filter is active — click "All Zones" to reset.</p>
                <p>• The map centers on Addis Ababa. If leads are in other cities, they may be off-screen.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="duplicate" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> Duplicate warning when adding a lead</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• The system uses fuzzy matching to detect potential duplicates by company name and phone number.</p>
                <p>• Review the suggested match — if it's the same company, open the existing lead instead.</p>
                <p>• If it's a different company with a similar name, you can proceed with creating the new lead.</p>
                <p>• Repeated duplicate attempts are flagged to managers.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports-empty" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> Reports show zero data</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• Check the date range — the default may not cover the period when leads were created.</p>
                <p>• Verify that filters (status, category, rep) aren't excluding all results.</p>
                <p>• Use the "This Month" or "Last Quarter" preset buttons to quickly adjust.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notifications" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-destructive" /> Not receiving notifications</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• Notifications appear via the bell icon in the top-right header bar.</p>
                <p>• Ensure you haven't marked all as read — new notifications will still appear for new events.</p>
                <p>• Browser notifications require permission — check your browser settings.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-semibold"><CheckCircle className="h-4 w-4 text-success" /> Still need help?</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-4">
                <p>• Contact your system administrator for account-related issues.</p>
                <p>• For technical problems, note the exact error message and the page where it occurred.</p>
                <p>• Include your browser name and version when reporting display issues.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManual;
