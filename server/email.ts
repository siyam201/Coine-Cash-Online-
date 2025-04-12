import { User } from "@shared/schema";
import nodemailer from 'nodemailer';

/**
 * This module provides real email functionality via Nodemailer
 * Configurable to use actual SMTP server credentials from environment variables
 */

// Flag to control email sending
// Set to false to enable transaction email notifications
const DISABLE_EMAILS = false;

// Create nodemailer transporter
let transporter: nodemailer.Transporter;

// Flag to force using Ethereal test account for debugging
const FORCE_ETHEREAL = false;

// Async function to create ethereal test account for email testing
async function createTransporter() {
  // Force use Ethereal for testing due to Gmail SMTP issues
  if (FORCE_ETHEREAL || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Create a test account on ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    // console.log('[EMAIL] Created test account:', testAccount.user);
    // console.log('[EMAIL] Test account password:', testAccount.pass);

    // Create a reusable transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });

    console.log('[EMAIL] Using Ethereal test account for emails');
  } else {
    // Use real Gmail account
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('[EMAIL] Using Gmail for emails');
  }
}

// Initialize transporter
createTransporter();

// Helper function to send an email
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log('[EMAIL] Transporter not ready, initializing...');
    await createTransporter();
  }

  // Get the "from" email, either from env or from ethereal test account
  const fromEmail = process.env.EMAIL_USER || 
    ((transporter as any).options?.auth?.user) || 
    'authotp247@gmail.com';

  const mailOptions = {
    from: `"Coine Cash Online" <${fromEmail}>`,
    to,
    subject,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Email sent successfully to ${to}`);

    // If using Ethereal, log preview URL
    if (info.messageId && info.previewURL) {
      console.log(`[EMAIL] Preview URL: ${info.previewURL}`);
    }
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error);
    // Still log the content for debugging
    console.log(`[EMAIL CONTENT] Would have sent to ${to}:\nSubject: ${subject}\nBody: ${html}`);
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  if (DISABLE_EMAILS) {
    console.log(`[EMAIL DISABLED] Would send verification email to ${email} with code: ${code}`);
    return;
  }

  const subject = 'Your Verification Code for Coine Cash Online';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4a6ee0;">Coine Cash Online</h2>
      </div>
      <p>Hello,</p>
      <p>Here is your verification code to complete your account registration:</p>
      <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 24px; margin: 20px 0; border-radius: 4px;">
        <span style="font-weight: bold; letter-spacing: 5px;">${code}</span>
      </div>
      <p>This code will expire in 10 minutes. Please enter it on the verification page to activate your account.</p>
      <p>If you did not create an account with us, you can safely ignore this message.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from Coine Cash Online.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  if (DISABLE_EMAILS) {
    console.log(`[EMAIL DISABLED] Would send password reset email to ${email} with code: ${code}`);
    return;
  }

  const subject = 'Your Password Reset Code for Coine Cash Online';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4a6ee0;">Coine Cash Online</h2>
      </div>
      <p>Hello,</p>
      <p>Here is your password reset code:</p>
      <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 24px; margin: 20px 0; border-radius: 4px;">
        <span style="font-weight: bold; letter-spacing: 5px;">${code}</span>
      </div>
      <p>This code will expire in 10 minutes. Please enter it on the password reset page.</p>
      <p>If you did not request a password reset, you can safely ignore this message.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from Coine Cash Online.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

export async function sendTransactionNotificationEmail(
  sender: User, 
  receiver: User, 
  amount: number
): Promise<void> {
  if (DISABLE_EMAILS) {
    console.log(`[EMAIL DISABLED] Would send transaction notification: ${sender.name} sent ${amount} to ${receiver.name}`);
    return;
  }

  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const timestamp = new Date().toLocaleString();

  // Send notification to sender
  const senderSubject = 'Your Coine Cash Transaction Receipt';
  const senderHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4a6ee0;">Coine Cash Online</h2>
      </div>
      <p>Hello ${sender.name},</p>
      <p>Your transaction has been completed successfully.</p>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Transaction Details:</strong></p>
        <p style="margin: 8px 0;">Amount Sent: <span style="color: #d9534f;">${formattedAmount}</span></p>
        <p style="margin: 8px 0;">Recipient: ${receiver.name} (${receiver.email})</p>
        <p style="margin: 8px 0;">Transaction Time: ${timestamp}</p>
        <p style="margin: 8px 0;">New Balance: <span style="color: #5cb85c;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sender.balance - amount)}</span></p>
      </div>
      
      <p>Thank you for using Coine Cash Online.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from Coine Cash Online.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail(sender.email, senderSubject, senderHtml);

  // Send notification to receiver
  const receiverSubject = 'You Received Money on Coine Cash Online';
  const receiverHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4a6ee0;">Coine Cash Online</h2>
      </div>
      <p>Hello ${receiver.name},</p>
      <p>You have received a payment to your account.</p>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Payment Details:</strong></p>
        <p style="margin: 8px 0;">Amount Received: <span style="color: #5cb85c;">${formattedAmount}</span></p>
        <p style="margin: 8px 0;">From: ${sender.name} (${sender.email})</p>
        <p style="margin: 8px 0;">Transaction Time: ${timestamp}</p>
        <p style="margin: 8px 0;">Updated Balance: <span style="color: #5cb85c;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(receiver.balance + amount)}</span></p>
      </div>
      
      <p>Thank you for using Coine Cash Online.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from Coine Cash Online.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail(receiver.email, receiverSubject, receiverHtml);
}

export async function sendLowBalanceWarningEmail(user: User): Promise<void> {
  if (DISABLE_EMAILS) {
    console.log(`[EMAIL DISABLED] Would send low balance warning to ${user.email}. Current balance: ${user.balance}`);
    return;
  }

  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(user.balance);
  const timestamp = new Date().toLocaleString();

  const subject = 'Balance Notice - Coine Cash Online';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4a6ee0;">Coine Cash Online</h2>
      </div>
      <p>Hello ${user.name},</p>
      <p>This is a friendly notice about your account balance.</p>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 8px 0;"><strong>Account Balance Notice</strong></p>
        <p style="margin: 8px 0;">Your current balance is <span style="color: #d9534f; font-weight: bold;">${formattedBalance}</span></p>
        <p style="margin: 8px 0;">We recommend maintaining a minimum balance of $1,000 in your account to ensure uninterrupted service.</p>
      </div>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Available Funding Options:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Bank transfer</li>
          <li>Mobile banking</li>
          <li>Payment card</li>
        </ul>
      </div>
      
      <p>Thank you for using Coine Cash Online.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from Coine Cash Online.<br>
        Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail(user.email, subject, html);
}