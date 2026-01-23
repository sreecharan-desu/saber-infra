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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #333; border-radius: 8px; background-color: #0a0a0a; }
            .logo { font-weight: bold; font-size: 24px; letter-spacing: -1px; margin-bottom: 32px; color: #fff; text-decoration: none; display: flex; align-items: center; }
            .logo-triangle { width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-bottom: 20px solid #fff; margin-right: 10px; }
            .title { font-size: 20px; font-weight: 600; margin-bottom: 16px; letter-spacing: -0.5px; }
            .message { color: #888; line-height: 1.6; font-size: 15px; margin-bottom: 32px; }
            .card { background: #111; border: 1px solid #333; padding: 24px; border-radius: 6px; margin-bottom: 32px; }
            .card-label { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
            .card-content { font-size: 16px; color: #fff; font-weight: 500; }
            .btn { background: #fff; color: #000; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px; }
            .footer { margin-top: 40px; border-top: 1px solid #333; pt: 24px; font-size: 12px; color: #444; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <div class="logo-triangle"></div> SABER
            </div>
            <h1 class="title">Handshake Request from ${companyName}</h1>
            <p class="message">
                Hello ${candidateName}, a high-performance workspace has identified your technical signal as a prime match for their current mission.
            </p>
            <div class="card">
                <div class="card-label">Problem Statement</div>
                <div class="card-content">
                    "${problemStatement}"
                </div>
            </div>
            <p class="message">
                Review the technical requirements and confirm your interest to initiate a mutual reveal.
            </p>
            <a href="https://saber.sh/discover/${jobId}" class="btn">View Challenge</a>
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
