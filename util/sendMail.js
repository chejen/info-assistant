'use strict';
import nodemailer from 'nodemailer';

export async function sendMail(config) {
  try {
    const transporter = nodemailer.createTransport({
      'host': process.env.MAIL_SERVER_HOST,
      'port': +(process.env.MAIL_SERVER_PORT || 587),
      'secure': false,
      'auth': {
        'user': process.env.MAIL_SENDER_USER,
        'pass': process.env.MAIL_SENDER_PASS,
      }
    });
    const info = await transporter.sendMail({
      ...config,
      from: `'Info. Sender' <${process.env.MAIL_SENDER_USER}>`, // TODO
      to: process.env.MAIL_RECIPIENT,
    });
    console.log('[%s] Message sent: %s', new Date(), info.messageId);
  } catch (e) {
    console.error(`[${new Date()}][ERR] failed to send email.`);
    throw e;
  }
}
