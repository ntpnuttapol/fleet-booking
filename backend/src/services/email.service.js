const { Resend } = require('resend');

// Mock Resend initialization if no key provided, to allow local testing
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

class EmailService {
    async sendNotificationEmail(email, notification, data) {
        if (!process.env.RESEND_API_KEY) {
            console.log(`[Email Mock] Would send email to ${email} for event ${notification.type}`);
            return;
        }

        try {
            const subject = notification.title;
            const html = this.getHtmlTemplate(notification, data);

            await resend.emails.send({
                from: 'FleetBook <noreply@yourcompany.com>', // Replace with verified domain
                to: email,
                subject,
                html,
            });
            console.log(`[Email] Sent ${notification.type} event to ${email}`);
        } catch (error) {
            console.error(`[Email Error] Failed to send email to ${email}:`, error);
        }
    }

    getHtmlTemplate(notification, data) {
        // A simple generic template based on the plan
        const detailsHtml = data ? Object.entries(data).map(([k, v]) => `
      <tr><td style="padding: 8px; color: #666;">${k}</td><td style="padding: 8px; font-weight: bold;">${v}</td></tr>
    `).join('') : '';

        return `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <table style="width: 100%; border-collapse: collapse;">
          ${detailsHtml}
        </table>
        ${data.bookingId ? `
        <div style="margin-top: 24px;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/bookings/${data.bookingId}" 
             style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            ดูรายละเอียด
          </a>
        </div>
        ` : ''}
      </div>
    `;
    }
}

module.exports = new EmailService();
