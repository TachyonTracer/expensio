import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters long')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validatedData = contactSchema.parse(body)
    
    // Create transporter (you'll need to configure this with your email service)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Email to admin
    const adminMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_EMAIL || 'admin@expensio.com',
      subject: `New Contact Form Submission from ${validatedData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${validatedData.name}</p>
            <p><strong>Email:</strong> ${validatedData.email}</p>
            <p><strong>Company:</strong> ${validatedData.company || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
              ${validatedData.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            This message was sent from the Expensio contact form.
          </p>
        </div>
      `,
    }

    // Auto-reply to user
    const userMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: validatedData.email,
      subject: 'Thank you for contacting Expensio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #2563eb;">Thank You for Contacting Us!</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hi ${validatedData.name},</p>
            <p>Thank you for your interest in Expensio! We've received your message and will get back to you within 24 hours.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Your Message:</h3>
              <p style="color: #6b7280;">${validatedData.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p>In the meantime, feel free to:</p>
            <ul style="color: #6b7280;">
              <li>Explore our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #2563eb;">platform features</a></li>
              <li>Start your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup" style="color: #2563eb;">free 14-day trial</a></li>
              <li>Check out our documentation</li>
            </ul>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The Expensio Team</p>
            <p>
              <a href="mailto:hello@expensio.com" style="color: #2563eb;">hello@expensio.com</a> | 
              <a href="tel:+15551234567" style="color: #2563eb;">+1 (555) 123-4567</a>
            </p>
          </div>
        </div>
      `,
    }

    // Send emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions)
    ])

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}