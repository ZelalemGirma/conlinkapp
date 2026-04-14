import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Conlink CRM"

interface MeetingReminderProps {
  companyName?: string
  scheduledAt?: string
  location?: string
  notes?: string
}

const MeetingReminderEmail = ({ companyName, scheduledAt, location, notes }: MeetingReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Meeting reminder: {companyName || 'Upcoming meeting'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>Meeting Reminder</Heading>
        </Section>
        <Text style={text}>
          You have an upcoming meeting{companyName ? ` with <strong>${companyName}</strong>` : ''}.
        </Text>
        {scheduledAt && (
          <Section style={detailBox}>
            <Text style={detailLabel}>When</Text>
            <Text style={detailValue}>{scheduledAt}</Text>
          </Section>
        )}
        {location && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Where</Text>
            <Text style={detailValue}>{location}</Text>
          </Section>
        )}
        {notes && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Notes</Text>
            <Text style={detailValue}>{notes}</Text>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MeetingReminderEmail,
  subject: (data: Record<string, any>) => `Meeting reminder: ${data.companyName || 'Upcoming meeting'}`,
  displayName: 'Meeting reminder',
  previewData: { companyName: 'Acme Corp', scheduledAt: 'Apr 15, 2026 at 10:00 AM', location: 'Head Office' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { borderBottom: '3px solid #F28C28', paddingBottom: '12px', marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1A2E44', margin: '0' }
const text = { fontSize: '14px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const detailBox = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '10px 14px', marginBottom: '8px' }
const detailLabel = { fontSize: '11px', color: '#888888', textTransform: 'uppercase' as const, margin: '0 0 2px', letterSpacing: '0.5px' }
const detailValue = { fontSize: '14px', color: '#1A2E44', fontWeight: 'bold' as const, margin: '0' }
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
