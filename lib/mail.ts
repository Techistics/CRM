import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendInviteEmail({
  email,
  tenantName,
  inviteLink,
}: {
  email: string
  tenantName: string
  inviteLink: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Edu CRM <${fromEmail}>`,
      to: email,
      subject: `You've been invited to join ${tenantName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111827;">Join the team</h1>
          <p style="margin-top: 16px; font-size: 16px; color: #4b5563; line-height: 24px;">
            You have been invited to join the <strong>${tenantName}</strong> workspace on Edu CRM.
          </p>
          <div style="margin-top: 24px;">
            <a href="${inviteLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">
               Accept Invitation
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send fatal error:', err)
    return { success: false, error: err }
  }
}

export async function sendPasswordResetEmail({
  email,
  resetLink,
}: {
  email: string
  resetLink: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Edu CRM <${fromEmail}>`,
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111827;">Reset your password</h1>
          <p style="margin-top: 16px; font-size: 16px; color: #4b5563; line-height: 24px;">
            We received a request to reset your password for your Edu CRM account. Click the button below to proceed:
          </p>
          <div style="margin-top: 24px;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">
               Reset Password
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 14px; color: #9ca3af;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send fatal error:', err)
    return { success: false, error: err }
  }
}

function buildBaseEmailTemplate({
  workspaceName,
  heading,
  intro,
  detailsHtml,
  ctaLabel,
  ctaUrl,
  footerText,
}: {
  workspaceName: string
  heading: string
  intro: string
  detailsHtml: string
  ctaLabel: string
  ctaUrl: string
  footerText: string
}) {
  return `
    <div style="font-family: sans-serif; background-color: #f1f5f9; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1d4ed8; padding: 24px; color: #ffffff; border-radius: 10px 10px 0 0;">
          <div style="font-size: 20px; font-weight: 700;">${workspaceName} CRM</div>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: 0;">
          <h1 style="margin: 0 0 12px; color: #0f172a; font-size: 24px;">${heading}</h1>
          <p style="margin: 0; color: #334155; line-height: 24px;">${intro}</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${detailsHtml}
          </div>
          <a href="${ctaUrl}" style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            ${ctaLabel}
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            ${footerText}
          </p>
        </div>
      </div>
    </div>
  `
}

export async function sendLeadAssignedEmail({
  agentEmail,
  agentName,
  leadName,
  contactNumber,
  leadEmail,
  stage,
  leadUrl,
  workspaceName,
}: {
  agentEmail: string
  agentName: string
  leadName: string
  contactNumber: string
  leadEmail: string
  stage: string
  leadUrl: string
  workspaceName: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Edu CRM <${fromEmail}>`,
      to: agentEmail,
      subject: `New lead assigned to you: ${leadName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'New lead assigned',
        intro: `Hi ${agentName}, a new lead has been assigned to you.`,
        detailsHtml: `
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Lead:</strong> ${leadName}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Contact:</strong> ${contactNumber || 'N/A'}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Email:</strong> ${leadEmail || 'N/A'}</p>
          <p style="margin: 0; color: #0f172a;"><strong>Stage:</strong> ${stage}</p>
        `,
        ctaLabel: 'Open Lead',
        ctaUrl: leadUrl,
        footerText: 'You are receiving this because lead assignment notifications are enabled for your workspace.',
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send fatal error:', err)
    return { success: false, error: err }
  }
}

export async function sendReminderEmail({
  agentEmail,
  agentName,
  reminderTitle,
  leadName,
  dueAt,
  leadUrl,
  workspaceName,
}: {
  agentEmail: string
  agentName: string
  reminderTitle: string
  leadName: string
  dueAt: Date
  leadUrl: string
  workspaceName: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Edu CRM <${fromEmail}>`,
      to: agentEmail,
      subject: `Reminder: ${reminderTitle} — ${leadName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Lead reminder',
        intro: `Hi ${agentName}, this is a reminder for one of your leads.`,
        detailsHtml: `
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Reminder:</strong> ${reminderTitle}</p>
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Lead:</strong> ${leadName}</p>
          <p style="margin: 0; color: #0f172a;"><strong>Due at:</strong> ${dueAt.toLocaleString()}</p>
        `,
        ctaLabel: 'View Lead',
        ctaUrl: leadUrl,
        footerText: 'Please follow up with the lead before the due time.',
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send fatal error:', err)
    return { success: false, error: err }
  }
}

export async function sendAccessApprovedEmail({
  userEmail,
  userName,
  roleName,
  workspaceName,
  signInUrl,
}: {
  userEmail: string
  userName: string
  roleName: string
  workspaceName: string
  signInUrl: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Edu CRM <${fromEmail}>`,
      to: userEmail,
      subject: `Your access request has been approved — ${workspaceName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Access approved',
        intro: `Hi ${userName}, your workspace access request has been approved.`,
        detailsHtml: `
          <p style="margin: 0 0 8px; color: #0f172a;"><strong>Workspace:</strong> ${workspaceName}</p>
          <p style="margin: 0; color: #0f172a;"><strong>Role:</strong> ${roleName}</p>
        `,
        ctaLabel: 'Sign In',
        ctaUrl: signInUrl,
        footerText: 'If you did not request this access, contact your workspace administrator.',
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send fatal error:', err)
    return { success: false, error: err }
  }
}
