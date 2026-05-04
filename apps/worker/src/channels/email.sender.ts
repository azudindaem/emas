import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

export async function sendEmail(
  config: EmailConfig,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
  })
}
