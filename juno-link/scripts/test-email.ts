import 'dotenv/config';
import { sendEmail } from '../src/lib/email/sender';

async function main() {
    const testEmail = process.argv[2];
    if (!testEmail) {
        console.log('Usage: npx tsx scripts/test-email.ts <your-email>');
        process.exit(1);
    }

    console.log(`Sending test email to: ${testEmail}...`);
    const result = await sendEmail({
        to: testEmail,
        subject: 'Juno Link Email Test',
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #006493;">Juno Link Test</h1>
                <p>If you see this, the email integration is working!</p>
                <hr />
                <p style="font-size: 12px; color: #666;">Sent at: ${new Date().toLocaleString()}</p>
            </div>
        `
    });

    if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('Result ID:', (result.data as any)?.id || 'N/A');
        console.log('\nNOTE: If you are using Resend\'s free tier without a custom domain,');
        console.log('you can only send emails to the address associated with your Resend account.');
    } else {
        console.error('❌ Failed to send test email.');
        console.error('Error:', result.error);
    }
}

main().catch(console.error);
