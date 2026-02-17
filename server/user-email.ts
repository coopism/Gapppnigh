import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'GapNight <noreply@gapnight.com>';
  
  return {
    client: apiKey ? new Resend(apiKey) : null,
    fromEmail
  };
}

const BASE_URL = process.env.BASE_URL || 'https://www.gapnight.com';

export async function sendVerificationEmail(
  email: string, 
  token: string, 
  name?: string | null
): Promise<boolean> {
  const isOtp = /^\d{6}$/.test(token);
  const verifyUrl = isOtp ? null : `${BASE_URL}/verify-email?token=${token}`;
  
  // Log for development
  console.log(`[EMAIL] Verification email for ${email}`);
  if (isOtp) {
    console.log(`[EMAIL] OTP Code: ${token}`);
  } else {
    console.log(`[EMAIL] Verify URL: ${verifyUrl}`);
  }
  
  const { client, fromEmail } = getResendClient();
  
  if (!client) {
    console.log('[EMAIL] Resend not configured, skipping email send');
    return true; // Return success in dev mode
  }
  
  try {
    const actionBlock = isOtp
      ? `
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #4b5563; font-size: 14px; margin-bottom: 12px;">Your verification code is:</p>
      <div style="display: inline-block; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 12px; padding: 16px 32px;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0ea5e9; font-family: monospace;">${token}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">Enter this code on the verification page to confirm your email.</p>
    </div>`
      : `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" 
         style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Welcome to GapNight!</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi${name ? ` ${name}` : ''},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Thanks for signing up! Please verify your email address to complete your registration.
    </p>
    
    ${actionBlock}
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This ${isOtp ? 'code' : 'link'} expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      GapNight &mdash; Accommodation you'll love, for less
    </p>
  </div>
</body>
</html>
    `;

    const verifyGreeting = name ? 'Hi ' + name + ',' : 'Hi,';
    const emailTextContent = isOtp
      ? [verifyGreeting, '', 'Thanks for signing up for GapNight!', '', 'Your verification code is: ' + token, '', 'Enter this code on the verification page to confirm your email.', "This code expires in 24 hours. If you didn't create an account, you can safely ignore this email.", '', '- GapNight'].join('\n')
      : [verifyGreeting, '', 'Thanks for signing up for GapNight!', '', 'Verify your email by visiting:', verifyUrl || '', '', "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.", '', '- GapNight'].join('\n');

    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: isOtp ? `${token} is your GapNight verification code` : 'Verify your GapNight account',
      html: emailHtml,
      text: emailTextContent,
    });

    console.log('[EMAIL] Verification email sent successfully');
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  name?: string | null
): Promise<boolean> {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  
  // Log for development
  console.log(`[EMAIL] Password reset email for ${email}`);
  console.log(`[EMAIL] Reset URL: ${resetUrl}`);
  
  const { client, fromEmail } = getResendClient();
  
  if (!client) {
    console.log('[EMAIL] Resend not configured, skipping email send');
    return true; // Return success in dev mode
  }
  
  try {
    const emailHtml = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi${name ? ` ${name}` : ''},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      We received a request to reset your GapNight password. Click the button below to choose a new password.
    </p>
    
    <!-- Bulletproof button — works in Outlook, Gmail, Apple Mail -->
    <div style="text-align: center; margin: 30px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
        <tr>
          <td style="border-radius: 8px; background: #0ea5e9;">
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
               style="display: inline-block; background: #0ea5e9; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; mso-padding-alt: 0; text-underline-color: #0ea5e9;">
              <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:27pt" hidden>&emsp;</i><![endif]-->
              <span style="mso-text-raise:13pt;">Reset Password</span>
              <!--[if mso]><i style="mso-font-width:150%;" hidden>&emsp;&#8203;</i><![endif]-->
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center; word-break: break-all;">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; text-decoration: underline;">${resetUrl}</a>
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      GapNight &mdash; Accommodation you'll love, for less
    </p>
  </div>
</body>
</html>
    `;

    const greeting = name ? 'Hi ' + name + ',' : 'Hi,';
    const emailText = [
      greeting,
      '',
      'We received a request to reset your GapNight password.',
      'Click the link below to choose a new password:',
      '',
      resetUrl,
      '',
      "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
      '',
      '- GapNight',
    ].join('\n');

    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your GapNight password',
      html: emailHtml,
      text: emailText,
    });

    console.log('[EMAIL] Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    return false;
  }
}
