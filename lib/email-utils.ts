import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { env } from '@/lib/env';

const smtpHost = env.SMTP_HOST;
const smtpUser = env.SMTP_USER;
const smtpPass = env.SMTP_PASS;
const defaultFromAddress = env.FROM_EMAIL;
const resolvedPort = env.SMTP_PORT ?? 587;

let transporter: Transporter | null = null;

if (smtpHost && smtpUser && smtpPass && defaultFromAddress) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: resolvedPort,
    secure: resolvedPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else if (process.env.NODE_ENV !== 'test') {
  console.info(
    '[Email] SMTP configuration is incomplete. Email delivery is disabled.',
    {
      hasHost: Boolean(smtpHost),
      hasUser: Boolean(smtpUser),
      hasPass: Boolean(smtpPass),
      hasFrom: Boolean(defaultFromAddress),
    }
  );
}

export async function sendEmail(options: SendMailOptions, context: string): Promise<void> {
  if (!transporter) {
    if (process.env.NODE_ENV !== 'test') {
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      console.info(
        `[Email] Skipping ${context} email because SMTP is disabled.`,
        recipients ? { recipients } : undefined
      );
    }
    return;
  }

  const finalOptions: SendMailOptions = {
    ...options,
    from: options.from ?? defaultFromAddress,
  };

  await transporter.sendMail(finalOptions);
}

export function isSmtpEnabled(): boolean {
  return transporter !== null;
}

/**
 * Generate a random password
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Send welcome email to new admin user
 */
export async function sendWelcomeEmail(
  email: string,
  companyName: string,
  password: string
): Promise<void> {
  const mailOptions = {
    from: env.FROM_EMAIL,
    to: email,
    subject: `Welcome to Expensio - ${companyName} Setup Complete`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Expensio</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #059669;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .success-box {
            background-color: #d1fae5;
            border: 1px solid #059669;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #059669;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to Expensio!</h1>
          <p>Your company setup is complete</p>
        </div>
        
        <div class="content">
          <h2>Congratulations!</h2>
          
          <div class="success-box">
            <strong>✅ Setup Complete!</strong><br>
            Your company <strong>${companyName}</strong> has been successfully set up on Expensio.
          </div>
          
          <p>As the administrator, you now have full access to manage your company's expense management system.</p>
          
          <h3>What you can do now:</h3>
          <ul>
            <li><strong>Add Users:</strong> Invite employees and managers to your company</li>
            <li><strong>Configure Approval Rules:</strong> Set up expense approval workflows</li>
            <li><strong>Manage Settings:</strong> Customize your company preferences</li>
            <li><strong>View Analytics:</strong> Monitor company-wide expense trends</li>
          </ul>
          
          <p>
            <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
              Access Your Dashboard
            </a>
          </p>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Log in to your admin dashboard</li>
            <li>Add your team members</li>
            <li>Set up approval workflows</li>
            <li>Start managing expenses efficiently!</li>
          </ol>
          
          <p>If you need any assistance getting started, our support team is here to help.</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Expensio for your expense management needs!</p>
          <p>This email was sent to confirm your company setup completion.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Expensio - ${companyName}

Congratulations! Your company setup is complete.

As the administrator, you can now:
- Add users to your company
- Configure approval rules
- Manage company settings
- View expense analytics

Access your dashboard: ${env.NEXT_PUBLIC_APP_URL}/dashboard

Next Steps:
1. Log in to your admin dashboard
2. Add your team members
3. Set up approval workflows
4. Start managing expenses!

Thank you for choosing Expensio!
    `,
  };

  await sendEmail(mailOptions, 'welcome');
}

/**
 * Send password email to new user
 */
export async function sendPasswordEmail(
  email: string,
  password: string,
  companyName: string
): Promise<void> {
  const mailOptions = {
    from: env.FROM_EMAIL,
    to: email,
    subject: `Welcome to ${companyName} - Your Expensio Account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Expensio</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .password-box {
            background-color: #e5e7eb;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            border: 2px dashed #9ca3af;
          }
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #4f46e5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Expensio</h1>
          <p>Your expense management account is ready!</p>
        </div>
        
        <div class="content">
          <h2>Hello!</h2>
          
          <p>You've been added to <strong>${companyName}</strong>'s Expensio expense management system. You can now submit and track your expenses easily through our platform.</p>
          
          <h3>Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong></p>
          
          <div class="password-box">
            ${password}
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul>
              <li>This is a temporary password generated for your account</li>
              <li>Please change your password immediately after your first login</li>
              <li>Do not share this password with anyone</li>
              <li>This email contains sensitive information - please delete it after logging in</li>
            </ul>
          </div>
          
          <p>
            <a href="${env.NEXT_PUBLIC_APP_URL}/login" class="button">
              Login to Expensio
            </a>
          </p>
          
          <h3>Getting Started:</h3>
          <ol>
            <li>Click the login button above or visit <a href="${env.NEXT_PUBLIC_APP_URL}">${env.NEXT_PUBLIC_APP_URL}</a></li>
            <li>Use your email and the temporary password above to log in</li>
            <li>Change your password in your profile settings</li>
            <li>Start submitting your expenses!</li>
          </ol>
          
          <p>If you have any questions or need help getting started, please contact your administrator or IT support.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Expensio on behalf of ${companyName}</p>
          <p>If you believe you received this email in error, please contact your administrator.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Expensio - ${companyName}

You've been added to ${companyName}'s expense management system.

Login Credentials:
Email: ${email}
Temporary Password: ${password}

IMPORTANT: This is a temporary password. Please change it immediately after your first login.

Login at: ${env.NEXT_PUBLIC_APP_URL}/login

Getting Started:
1. Visit the login page
2. Use your email and temporary password
3. Change your password in profile settings
4. Start submitting expenses!

If you need help, contact your administrator.
    `,
  };

  await sendEmail(mailOptions, 'temporary password');
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  companyName: string
): Promise<void> {
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: env.FROM_EMAIL,
    to: email,
    subject: `Password Reset Request - ${companyName} Expensio`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Expensio</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
          <h2>Reset Your Password</h2>
          
          <p>We received a request to reset the password for your Expensio account at <strong>${companyName}</strong>.</p>
          
          <p>If you requested this password reset, click the button below to create a new password:</p>
          
          <p>
            <a href="${resetUrl}" class="button">
              Reset Password
            </a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your current password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p>If you're having trouble with the link above, contact your administrator for assistance.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Expensio on behalf of ${companyName}</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Password Reset Request - ${companyName} Expensio

We received a request to reset your password.

If you requested this, click the link below to reset your password:
${resetUrl}

This link expires in 1 hour.

If you didn't request this reset, please ignore this email.

Contact your administrator if you need assistance.
    `,
  };

  await sendEmail(mailOptions, 'password reset');
}

/**
 * Verify email transporter configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  if (!transporter) {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Email] SMTP is disabled; skipping transporter verification.');
    }
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}