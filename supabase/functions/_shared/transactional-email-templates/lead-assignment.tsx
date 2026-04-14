import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Conlink CRM"

interface LeadAssignmentProps {
  companyName?: string
  category?: string
  assignedBy?: string
}

const LeadAssignmentEmail = ({ companyName, category, assignedBy }: LeadAssignmentProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New lead assigned: {companyName || 'A lead'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>New Lead Assigned to You</Heading>
        </Section>
        <Text style={text}>
          {assignedBy ? `${assignedBy} has assigned` : 'You have been assigned'} a new lead{companyName ? `: <strong>${companyName}</strong>` : ''}.
        </Text>
        {category && (
          <Section style={detailBox}>
            <Text style={detailLabel}>Category</Text>
            <Text style={detailValue}>{category}</Text>
          </Section>
        )}
        <Text style={text}>
          Please review and follow up as soon as possible.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadAssignmentEmail,
  subject: (data: Record<string, any>) => `New lead assigned: ${data.companyName || 'A new lead'}`,
  displayName: 'Lead assignment notification',
  previewData: { companyName: 'Acme Corp', category: 'Building Materials', assignedBy: 'Admin' },
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
