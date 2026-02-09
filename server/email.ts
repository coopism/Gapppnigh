// Resend email integration for GapNight booking confirmations
import { Resend } from 'resend';
import type { Booking } from "@shared/schema";
import { format, parseISO } from "date-fns";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'GapNight <bookings@gapnight.com>';
  
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
    <p style="margin: 0;">Questions? Contact us at info@gapnight.com</p>
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

// Send notification to admin for hotel inquiry
export async function sendHotelInquiryNotification(inquiry: {
  hotelName: string;
  city: string;
  contactEmail: string;
  gapNightsPerWeek: string;
}): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Hotel Partnership Inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a1a;">New Hotel Partnership Inquiry</h2>
  
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Hotel Name:</strong> ${inquiry.hotelName}</p>
    <p><strong>City:</strong> ${inquiry.city}</p>
    <p><strong>Contact Email:</strong> <a href="mailto:${inquiry.contactEmail}">${inquiry.contactEmail}</a></p>
    <p><strong>Estimated Gap Nights/Week:</strong> ${inquiry.gapNightsPerWeek}</p>
  </div>
  
  <p style="color: #666; font-size: 14px;">Reply directly to this email to contact the hotel.</p>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: 'info@gapnight.com',
      replyTo: inquiry.contactEmail,
      subject: `New Hotel Inquiry: ${inquiry.hotelName} (${inquiry.city})`,
      html: emailHtml,
    });

    console.log('Hotel inquiry notification sent');
    return true;
  } catch (error) {
    console.error('Failed to send hotel inquiry notification:', error);
    return false;
  }
}

// Send notification to admin for waitlist signup
export async function sendWaitlistNotification(entry: {
  email: string;
  preferredCity?: string;
}): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Waitlist Signup</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a1a;">New Waitlist Signup</h2>
  
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Email:</strong> <a href="mailto:${entry.email}">${entry.email}</a></p>
    ${entry.preferredCity ? `<p><strong>Preferred City:</strong> ${entry.preferredCity}</p>` : ''}
  </div>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail,
      to: 'info@gapnight.com',
      subject: `New Waitlist Signup${entry.preferredCity ? ` - ${entry.preferredCity}` : ''}`,
      html: emailHtml,
    });

    console.log('Waitlist notification sent');
    return true;
  } catch (error) {
    console.error('Failed to send waitlist notification:', error);
    return false;
  }
}

// ========================================
// PROPERTY NOTIFICATION EMAILS
// ========================================

export async function sendPropertyApprovalEmail(property: any, host: any): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a;">New Property Submission</h1>
  <p>A new property has been submitted for approval on GapNight.</p>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Property Details</h3>
    <p><strong>Title:</strong> ${property.title}</p>
    <p><strong>Type:</strong> ${property.propertyType} - ${property.category}</p>
    <p><strong>Location:</strong> ${property.city}, ${property.state || ''} ${property.country}</p>
    <p><strong>Address:</strong> ${property.address}</p>
    <p><strong>Bedrooms:</strong> ${property.bedrooms} | <strong>Beds:</strong> ${property.beds} | <strong>Bathrooms:</strong> ${property.bathrooms}</p>
    <p><strong>Max Guests:</strong> ${property.maxGuests}</p>
    <p><strong>Base Rate:</strong> $${(property.baseNightlyRate / 100).toFixed(2)}/night</p>
    <p><strong>Cleaning Fee:</strong> $${((property.cleaningFee || 0) / 100).toFixed(2)}</p>
  </div>

  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Host Details</h3>
    <p><strong>Name:</strong> ${host.name}</p>
    <p><strong>Email:</strong> <a href="mailto:${host.email}">${host.email}</a></p>
    <p><strong>Phone:</strong> ${host.phone || 'Not provided'}</p>
  </div>

  <p style="color: #666; font-size: 14px;">Please review this property in the admin panel at /admin/dashboard</p>
</body>
</html>`;

    await client.emails.send({
      from: fromEmail,
      to: 'info@gapnight.com',
      subject: `New Property Submission: ${property.title} - ${property.city}`,
      html: emailHtml,
    });

    console.log('Property approval email sent');
    return true;
  } catch (error) {
    console.error('Failed to send property approval email:', error);
    return false;
  }
}

export async function sendPropertyBookingConfirmationEmail(booking: any, property: any, host: any): Promise<boolean> {
  try {
    const { client, fromEmail } = getResendClient();

    const checkInDate = format(parseISO(booking.checkInDate), "EEEE, MMMM d, yyyy");
    const checkOutDate = format(parseISO(booking.checkOutDate), "EEEE, MMMM d, yyyy");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin-bottom: 5px;">GapNight</h1>
    <p style="color: #666; font-size: 14px;">Your Booking is Confirmed!</p>
  </div>

  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
    <h2 style="margin: 0 0 10px 0;">Booking Confirmed</h2>
    <p style="margin: 0; font-size: 24px; font-weight: bold;">${booking.id}</p>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0;">Property Details</h3>
    <p style="margin: 0 0 8px 0;"><strong>${property.title}</strong></p>
    <p style="margin: 0 0 8px 0;">${property.address}, ${property.city}</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
    <p style="margin: 0 0 5px 0;"><strong>Check-in:</strong> ${checkInDate} (${property.checkInTime || '15:00'})</p>
    <p style="margin: 0 0 5px 0;"><strong>Check-out:</strong> ${checkOutDate} (${property.checkOutTime || '10:00'})</p>
    <p style="margin: 0 0 5px 0;"><strong>Nights:</strong> ${booking.nights}</p>
    <p style="margin: 0 0 5px 0;"><strong>Guests:</strong> ${booking.guests}</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
    <p style="margin: 0; font-size: 18px;"><strong>Total Paid: $${(booking.totalPrice / 100).toFixed(2)} AUD</strong></p>
  </div>

  <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0;">Your Host</h3>
    <p style="margin: 0 0 8px 0;"><strong>${host.name}</strong></p>
    ${property.checkInInstructions ? `
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
    <h4 style="margin: 0 0 8px 0;">Check-in Instructions</h4>
    <p style="margin: 0;">${property.checkInInstructions}</p>
    ` : ''}
    ${property.houseRules ? `
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
    <h4 style="margin: 0 0 8px 0;">House Rules</h4>
    <p style="margin: 0;">${property.houseRules}</p>
    ` : ''}
  </div>

  <p style="color: #999; font-size: 12px; text-align: center;">
    GapNight - Gap Night Deals on Short-Term Rentals
  </p>
</body>
</html>`;

    await client.emails.send({
      from: fromEmail,
      to: booking.guestEmail,
      subject: `Booking Confirmed - ${property.title} | ${booking.id}`,
      html: emailHtml,
    });

    console.log('Property booking confirmation email sent to', booking.guestEmail);
    return true;
  } catch (error) {
    console.error('Failed to send property booking confirmation email:', error);
    return false;
  }
}
