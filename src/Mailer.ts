import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer'
import { Url } from 'url'
import { AddQueueModelAttributes, NsqMailQueue } from './QueueModel'

export default class Mailer implements IMailer {
  private transporter

  constructor(defaults?: any, transport?: Transporter) {
    this.transporter = transport
      ? nodemailer.createTransport(transport, defaults)
      : nodemailer.createTransport(defaults)
  }

  async sendMail(message: Message): Promise<SentMessageInfo> {
    const mailResult: SentMessageInfo = await this.transporter.sendMail(message)

    return mailResult
  }
  composeMailFromModel(mail: NsqMailQueue | AddQueueModelAttributes): Message {
    const message: Message = {
      from: mail.email_from,
      to: mail.email_to,
      subject: mail.subject,
      html: mail.html,
      attachments: mail.attachments,
    }
    return message
  }
}

export interface IMailer {
  sendMail(message: Message): Promise<SentMessageInfo>
  composeMailFromModel(mail: NsqMailQueue): Message
}

export interface Attachment {
  /** filename to be reported as the name of the attached file, use of unicode is allowed. If you do not want to use a filename, set this value as false, otherwise a filename is generated automatically */
  filename?: string | false
  /** path to a file or an URL (data uris are allowed as well) if you want to stream the file instead of including it (better for larger attachments) */
  path?: string | Url
  url?: string | Url
}

export type Message = {
  from: string
  to: string
  subject: string
  html: string
  attachments?: Attachment[]
}
