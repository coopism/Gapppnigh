// Resend email integration for GapNight booking confirmations
import { Resend } from 'resend';
import type { Booking } from "@shared/schema";
import { format, parseISO } from "date-fns";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'GapNight <noreply@gapnight.com>';
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendBookingConfirmationEmail(booking: Booking): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const checkInDate = format(parseISO(booking.checkInDate), "EEEE, MMMM d, yyyy");
    const checkOutDate = format(parseISO(booking.checkOutDate), "EEEE, MMMM d, yyyy");
    const gstIncluded = Math.round(booking.totalPrice / 11);
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin-bottom: 5px;">GapNight</h1>
    <p style="color: #666; font-size: 14px;">Your Gap Night Deal is Confirmed!</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
    <h2 style="margin: 0 0 10px 0;">Booking Confirmed</h2>
    <p style="margin: 0; font-size: 24px; font-weight: bold;">${booking.id}</p>
    <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Keep this reference for your records</p>
  </div>
  
  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Hotel Details</h3>
    <p style="margin: 0 0 8px 0;"><strong>${booking.hotelName}</strong></p>
    <p style="margin: 0 0 8px 0; color: #666;">${booking.roomType}</p>
    
    <div style="border-top: 1px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <div>
          <p style="margin: 0; color: #666; font-size: 12px;">CHECK-IN</p>
          <p style="margin: 0; font-weight: 600;">${checkInDate}</p>
          <p style="margin: 0; color: #666; font-size: 12px;">From 3:00 PM</p>
        </div>
      </div>
      <div>
        <p style="margin: 0; color: #666; font-size: 12px;">CHECK-OUT</p>
        <p style="margin: 0; font-weight: 600;">${checkOutDate}</p>
        <p style="margin: 0; color: #666; font-size: 12px;">Before 11:00 AM</p>
      </div>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
      <p style="margin: 0; color: #666; font-size: 12px;">DURATION</p>
      <p style="margin: 0; font-weight: 600;">${booking.nights} night${booking.nights > 1 ? 's' : ''}</p>
    </div>
  </div>
  
  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Guest Information</h3>
    <p style="margin: 0 0 8px 0;"><strong>${booking.guestFirstName} ${booking.guestLastName}</strong></p>
    <p style="margin: 0 0 8px 0; color: #666;">${booking.guestEmail}</p>
    <p style="margin: 0; color: #666;">${booking.guestCountryCode} ${booking.guestPhone}</p>
    ${booking.specialRequests ? `
    <div style="border-top: 1px solid #e5e7eb; margin: 15px 0; padding-top: 15px;">
      <p style="margin: 0; color: #666; font-size: 12px;">SPECIAL REQUESTS</p>
      <p style="margin: 5px 0 0 0;">${booking.specialRequests}</p>
    </div>
    ` : ''}
  </div>
  
  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">Payment Summary</h3>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #666;">Total (GST inclusive)</span>
      <span style="font-weight: 600;">${booking.currency}${booking.totalPrice}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #666; font-size: 12px;">Includes GST</span>
      <span style="color: #666; font-size: 12px;">${booking.currency}${gstIncluded}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #666; font-size: 12px;">Gap Night Fee</span>
      <span style="color: #10b981; font-size: 12px;">Waived - Promotion</span>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0 0 10px 0;">Thank you for booking with GapNight!</p>
    <p style="margin: 0;">Questions? Contact us at support@gapnight.com</p>
  </div>
</body>
</html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: booking.guestEmail,
      subject: `Booking Confirmed - ${booking.hotelName} (${booking.id})`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return false;
  }
}
