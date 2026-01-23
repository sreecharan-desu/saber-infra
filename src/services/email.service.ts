import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
    service: 'gmail', // Defaulting to gmail for common use, can be changed
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

interface JobOfferEmail {
    candidateEmail: string;
    candidateName: string;
    companyName: string;
    problemStatement: string;
    jobId: string;
}

export const sendJobOfferEmail = async ({
    candidateEmail,
    candidateName,
    companyName,
    problemStatement,
    jobId
}: JobOfferEmail) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Inter', -apple-system, sans-serif; background-color: #000; color: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #1a1a1a; border-radius: 12px; background-color: #050505; }
            .logo { font-weight: 800; font-size: 26px; letter-spacing: -2px; margin-bottom: 40px; color: #fff; text-decoration: none; display: flex; align-items: center; }
            .logo-mark { width: 32px; height: 32px; background: linear-gradient(135deg, #a855f7 0%, #f472b6 100%); border-radius: 6px; margin-right: 12px; display: inline-block; position: relative; }
            .logo-mark:after { content: ''; position: absolute; inset: 6px; background: #000; border-radius: 3px; clip-path: polygon(0 0, 100% 0, 0 100%); }
            .title { font-size: 24px; font-weight: 800; margin-bottom: 20px; letter-spacing: -1px; background: linear-gradient(to bottom, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .message { color: #888; line-height: 1.6; font-size: 16px; margin-bottom: 32px; }
            .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 32px; border-radius: 8px; margin-bottom: 32px; position: relative; overflow: hidden; }
            .card:before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #a855f7, transparent); }
            .card-label { font-size: 10px; font-weight: 800; color: #a855f7; text-transform: uppercase; letter-spacing: 0.25em; margin-bottom: 12px; }
            .card-content { font-size: 18px; color: #fff; font-weight: 600; line-height: 1.4; }
            .btn { background: #fff; color: #000; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 800; display: inline-block; font-size: 14px; letter-spacing: -0.5px; transition: all 0.2s ease; }
            .footer { margin-top: 48px; border-top: 1px solid #1a1a1a; padding-top: 24px; font-size: 11px; color: #333; text-transform: uppercase; letter-spacing: 0.1em; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <div class="logo-mark"></div> SABER
            </div>
            <h1 class="title">Handshake Materialized</h1>
            <p class="message">
                Hello ${candidateName}, a high-fidelity organizational mission has established a handshake with your technical core.
            </p>
            <div class="card">
                <div class="card-label">Core Mission Statement</div>
                <div class="card-content">
                    "${problemStatement}"
                </div>
            </div>
            <p class="message">
                Align your technical core with this mission to initiate full signal synchronization.
            </p>
            <a href="${process.env.FRONTEND_URL}/discover/${jobId}" class="btn">SYNCHRONIZE NOW</a>
            <div class="footer">
                Powered by SABER AI Engine. This is an automated discovery alert.
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"SABER Engineering" <${process.env.EMAIL_USER}>`,
            to: candidateEmail,
            subject: `Handshake: ${companyName} revealed a new challenge`,
            html: htmlTemplate
        });
        logger.info(`Email sent successfully to ${candidateEmail}`);
    } catch (err) {
        logger.error(`Failed to send email to ${candidateEmail}`, err);
    }
};
