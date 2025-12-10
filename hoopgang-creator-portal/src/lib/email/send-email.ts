// src/lib/email/send-email.ts
import { Resend } from 'resend';
import { ApprovedEmail } from './templates/approved';
import { ShippedEmail } from './templates/shipped';
import { DeliveredEmail } from './templates/delivered';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

interface SendApprovedEmailParams {
  to: string;
  creatorName: string;
  instagramHandle: string;
}

interface SendShippedEmailParams {
  to: string;
  creatorName: string;
  trackingNumber: string;
  carrier: string;
}

interface SendDeliveredEmailParams {
  to: string;
  creatorName: string;
  contentDeadline: Date;
}

export async function sendApprovedEmail({ 
  to, 
  creatorName, 
  instagramHandle 
}: SendApprovedEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: `HoopGang <${fromEmail}>`,
      to,
      subject: "You're in! Welcome to the HoopGang Creator Family 🏀",
      react: ApprovedEmail({ creatorName, instagramHandle }),
    });

    if (error) {
      console.error('Failed to send approved email:', error);
      throw error;
    }

    console.log('Approved email sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending approved email:', error);
    throw error;
  }
}

export async function sendShippedEmail({ 
  to, 
  creatorName, 
  trackingNumber,
  carrier 
}: SendShippedEmailParams) {
  const trackingUrl = `https://t.17track.net/en#nums=${trackingNumber}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: `HoopGang <${fromEmail}>`,
      to,
      subject: "Your HoopGang gear is on the way! 📦",
      react: ShippedEmail({ creatorName, trackingNumber, carrier, trackingUrl }),
    });

    if (error) {
      console.error('Failed to send shipped email:', error);
      throw error;
    }

    console.log('Shipped email sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending shipped email:', error);
    throw error;
  }
}

export async function sendDeliveredEmail({ 
  to, 
  creatorName, 
  contentDeadline 
}: SendDeliveredEmailParams) {
  const formattedDeadline = contentDeadline.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  const daysRemaining = Math.ceil(
    (contentDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  try {
    const { data, error } = await resend.emails.send({
      from: `HoopGang <${fromEmail}>`,
      to,
      subject: "Your gear arrived! Time to create 🔥",
      react: DeliveredEmail({ creatorName, contentDeadline: formattedDeadline, daysRemaining }),
    });

    if (error) {
      console.error('Failed to send delivered email:', error);
      throw error;
    }

    console.log('Delivered email sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending delivered email:', error);
    throw error;
  }
}