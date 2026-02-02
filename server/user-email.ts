import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'GapNight <bookings@gapnight.com>';
  
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
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;
  
  // Log for development
  console.log(`[EMAIL] Verification email for ${email}`);
  console.log(`[EMAIL] Verify URL: ${verifyUrl}`);
  
  const { client, fromEmail } = getResendClient();
  
  if (!client) {
    console.log('[EMAIL] Resend not configured, skipping email send');
    return true; // Return success in dev mode
  }
  
  try {
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
    <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">🌙 Welcome to GapNight!</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi${name ? ` ${name}` : ''},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Thanks for signing up! Please verify your email address to access your booking history and manage your account.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" 
         style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      GapNight - Last-minute hotel deals at unbeatable prices
    </p>
  </div>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify your GapNight account',
      html: emailHtml,
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
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">🔐 Reset Your Password</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hi${name ? ` ${name}` : ''},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      We received a request to reset your GapNight password. Click the button below to choose a new password.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      GapNight - Last-minute hotel deals at unbeatable prices
    </p>
  </div>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your GapNight password',
      html: emailHtml,
    });

    console.log('[EMAIL] Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    return false;
  }
}
