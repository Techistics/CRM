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
