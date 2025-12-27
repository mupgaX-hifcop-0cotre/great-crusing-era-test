import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Skipping email sending.');
        return { success: false, error: 'Configuration missing' };
    }

    try {
        const data = await resend.emails.send({
            from: 'Juno Link <onboarding@resend.dev>', // Update this with verified domain later
            to,
            subject,
            html,
        });
        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
