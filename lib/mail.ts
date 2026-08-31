import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

/**
 * Core Enterprise Template Wrapper
 * Modeled after premium SaaS platforms (Stripe, Vercel, Linear)
 */
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
  detailsHtml?: string
  ctaLabel: string
  ctaUrl: string
  footerText: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${heading}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560px" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Header / Brand Section -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; tracking-ratio: 0.05em; color: #4f46e5; letter-spacing: 0.5px;">${workspaceName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <h1 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 600; tracking-ratio: -0.025em; line-height: 28px;">${heading}</h1>
                    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 24px;">${intro}</p>
                    
                    <!-- Optional Data Block Box -->
                    ${detailsHtml ? `
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; background-color: #f8fafc; border-left: 3px solid #4f46e5; border-radius: 4px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            ${detailsHtml}
                          </td>
                        </tr>
                      </table>
                    ` : ''}

                    <!-- Action Button CTA -->
                    <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 8px; margin-bottom: 32px;">
                      <tr>
                        <td align="center" bgcolor="#0f172a" style="border-radius: 6px;">
                          <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 11px 24px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #0f172a; border: 1px solid #0f172a;">
                            ${ctaLabel}
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security / System Disclaimer Note -->
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 20px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                      ${footerText}
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Global Footer Information -->
              <table width="100%" max-width="560px" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin-top: 24px;">
                <tr>
                  <td align="center" style="padding: 0 32px; color: #94a3b8; font-size: 12px; line-height: 18px; text-align: center;">
                    This is an automated operational transmission from Consulty CRM.<br>
                    &copy; ${new Date().getFullYear()} Consulty. All rights reserved.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export async function sendInviteEmail({
  email,
  tenantName,
  inviteLink,
  workspaceUrl,
}: {
  email: string
  tenantName: string
  inviteLink: string
  workspaceUrl?: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Consulty <${fromEmail}>`,
      to: email,
      subject: `Invitation to join ${tenantName} on Consulty`,
      html: buildBaseEmailTemplate({
        workspaceName: 'Consulty',
        heading: 'Workspace Invitation',
        intro: `You have been provisioned access and officially invited to join the <strong>${tenantName}</strong> organization workspace.`,
        detailsHtml: workspaceUrl ? `
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 20px;">
            <strong style="color: #0f172a;">Target Endpoint Workspace:</strong><br> 
            <a href="${workspaceUrl}" style="color: #4f46e5; text-decoration: none; word-break: break-all;">${workspaceUrl}</a>
          </p>
        ` : undefined,
        ctaLabel: 'Accept Architecture Invitation',
        ctaUrl: inviteLink,
        footerText: "Security Note: If you were not anticipating this institutional invitation, please safely drop or ignore this transmission.",
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

export async function sendPasswordResetEmail({
  email,
  resetLink,
}: {
  email: string
  resetLink: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Consulty <${fromEmail}>`,
      to: email,
      subject: 'Reset your identity credentials',
      html: buildBaseEmailTemplate({
        workspaceName: 'Consulty Security',
        heading: 'Reset your password',
        intro: 'A credential modification request was submitted for your Consulty account infrastructure. Click the button below to configure your profile securely.',
        ctaLabel: 'Modify Account Password',
        ctaUrl: resetLink,
        footerText: 'Operational Parameter: This security link will expire safely within 1 hour. If you did not trigger this action, your credentials are safe and no further steps are required.',
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
      from: `Consulty <${fromEmail}>`,
      to: agentEmail,
      subject: `CRM Assignment: ${leadName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'New Allocation Assigned',
        intro: `Hello ${agentName}, a new customer asset profile has been assigned to you.`,
        detailsHtml: `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 22px;">
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 90px; font-weight: 500;">Lead Name:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${leadName}</td></tr>
            <tr><td style="padding-bottom: 6px; color: #64748b;">Contact:</td><td style="padding-bottom: 6px; color: #0f172a;">${contactNumber || '—'}</td></tr>
            <tr><td style="padding-bottom: 6px; color: #64748b;">Email Info:</td><td style="padding-bottom: 6px; color: #0f172a; text-decoration: none;">${leadEmail || '—'}</td></tr>
            <tr><td style="color: #64748b;">CRM Stage:</td><td><span style="background-color: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.3px;">${stage.replace('_', ' ')}</span></td></tr>
          </table>
        `,
        ctaLabel: 'Initialize Profile Followup',
        ctaUrl: leadUrl,
        footerText: 'Notification Parameter: You are receiving this because pipeline allocation alerts are active for your credential workspace profile.',
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
  reminderNote,
  leadName,
  leadEmail,
  leadPhone,
  dueAt,
  leadUrl,
  workspaceName,
}: {
  agentEmail: string
  agentName: string
  reminderTitle: string
  reminderNote?: string | null
  leadName: string
  leadEmail?: string | null
  leadPhone?: string | null
  dueAt: Date
  leadUrl: string
  workspaceName: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Consulty <${fromEmail}>`,
      to: agentEmail,
      subject: `CRM Task Alert: ${reminderTitle} — ${leadName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Scheduled Task Reminder',
        intro: `Hello ${agentName}, this is a system event trigger notice on your assigned pipelines.`,
        detailsHtml: `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 22px;">
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 90px; font-weight: 500;">Action Object:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${reminderTitle}</td></tr>
            ${reminderNote ? `<tr><td style="padding-bottom: 6px; color: #64748b; vertical-align: top;">System Notes:</td><td style="padding-bottom: 6px; color: #475569; font-style: italic;">"${reminderNote}"</td></tr>` : ''}
            <tr><td style="padding-bottom: 6px; color: #64748b;">Target Lead:</td><td style="padding-bottom: 6px; color: #0f172a;">${leadName}</td></tr>
            ${leadEmail ? `<tr><td style="padding-bottom: 6px; color: #64748b;">Email Address:</td><td style="padding-bottom: 6px; color: #0f172a;">${leadEmail}</td></tr>` : ''}
            ${leadPhone ? `<tr><td style="padding-bottom: 6px; color: #64748b;">Phone Record:</td><td style="padding-bottom: 6px; color: #0f172a;">${leadPhone}</td></tr>` : ''}
            <tr><td style="color: #64748b;">Execution Due:</td><td style="color: #ef4444; font-weight: 600;">${dueAt.toLocaleString()}</td></tr>
          </table>
        `,
        ctaLabel: 'Execute Pipeline Review',
        ctaUrl: leadUrl,
        footerText: 'Operational Checklist: Ensure system logs are brought up to spec immediately following communication deployment.',
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

export async function sendUnassignedLeadsAlertEmail({
  recipientEmail,
  recipientName,
  removedMemberName,
  unassignedCount,
  workspaceName,
  leadsUrl,
}: {
  recipientEmail: string
  recipientName: string
  removedMemberName: string
  unassignedCount: number
  workspaceName: string
  leadsUrl: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Consulty <${fromEmail}>`,
      to: recipientEmail,
      subject: `Action Required: ${unassignedCount} Unassigned Lead(s) in ${workspaceName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Unassigned Leads Require Attention',
        intro: `Hello ${recipientName}, a team member (<strong>${removedMemberName}</strong>) was removed from the workspace and their leads are now unassigned and awaiting redistribution.`,
        detailsHtml: `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 22px;">
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 130px; font-weight: 500;">Removed Member:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${removedMemberName}</td></tr>
            <tr><td style="color: #64748b;">Unassigned Leads:</td><td><span style="background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 4px;">${unassignedCount} lead${unassignedCount !== 1 ? 's' : ''} need assignment</span></td></tr>
          </table>
        `,
        ctaLabel: 'View Unassigned Leads',
        ctaUrl: leadsUrl,
        footerText: 'Operational Notice: You are receiving this because you have lead assignment authority in this workspace. Please redistribute these leads at your earliest convenience.',
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
  workspaceUrl,
}: {
  userEmail: string
  userName: string
  roleName: string
  workspaceName: string
  signInUrl: string
  workspaceUrl?: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Consulty <${fromEmail}>`,
      to: userEmail,
      subject: `Access Provisioned Notice — ${workspaceName}`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Authorization Provisioned',
        intro: `Hello ${userName}, your core access request credentials have been vetted, signed off, and approved by the domain controller.`,
        detailsHtml: `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 22px;">
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 100px; font-weight: 500;">Environment:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${workspaceName}</td></tr>
            ${workspaceUrl ? `<tr><td style="padding-bottom: 6px; color: #64748b;">Endpoint Matrix:</td><td style="padding-bottom: 6px; color: #4f46e5;"><a href="${workspaceUrl}" style="color: #4f46e5; text-decoration: none;">${workspaceUrl}</a></td></tr>` : ''}
            <tr><td style="color: #64748b;">Access Tier:</td><td><span style="background-color: #f1f5f9; color: #334155; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${roleName}</span></td></tr>
          </table>
        `,
        ctaLabel: 'Authenticate Session Dashboard',
        ctaUrl: signInUrl,
        footerText: 'Security Notice: If you did not request credential provisioning changes for this specific instance, drop this message and contact network operations.',
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

/**
 * Sends an email when an Admin resets a user's password manually.
 */
export async function sendAdminPasswordResetEmail({
  email,
  newPassword,
  workspaceName,
  loginUrl,
}: {
  email: string
  newPassword: string
  workspaceName: string
  loginUrl: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your password for ${workspaceName} has been reset`,
      html: buildBaseEmailTemplate({
        workspaceName,
        heading: 'Password Reset by Admin',
        intro: `An administrator for ${workspaceName} has reset your password. You can now log in using the temporary password provided below. Please remember to change it immediately after logging in (if permitted).`,
        detailsHtml: `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 22px;">
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 100px; font-weight: 500;">Email:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${email}</td></tr>
            <tr><td style="padding-bottom: 6px; color: #64748b; width: 100px; font-weight: 500;">New Password:</td><td style="padding-bottom: 6px; color: #0f172a; font-weight: 600; font-family: monospace; font-size: 16px;">${newPassword}</td></tr>
          </table>
        `,
        ctaLabel: 'Log In Now',
        ctaUrl: loginUrl,
        footerText: 'If you believe this is an error, please contact your administrator immediately.',
      }),
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('sendAdminPasswordResetEmail error:', error)
    return { success: false, error }
  }
}