import cron from 'node-cron'
import { Op } from 'sequelize'
import Mailer, { IMailer, Message } from './Mailer'
import { IQueueModelStatic, NsqMailQueue } from './QueueModel'
import logger from './utils/logger'

class Scheduler implements IScheduler {
  expression: string
  maxAttemps: number
  mailer: IMailer
  logging: boolean

  private queueModel: IQueueModelStatic

  constructor(
    smtpCredentials: any,
    queueModel: IQueueModelStatic,
    expression = '0 */1 * * *',
    maxAttemps = -1,
    logging = false
  ) {
    if (!isCronValid(expression)) {
      throw new Error('Cron expression is invalid')
    }
    this.expression = expression
    this.maxAttemps = maxAttemps
    this.logging = logging
    this.runJobs()
    this.queueModel = queueModel

    this.mailer = new Mailer(smtpCredentials)
  }

  private async runJobs() {
    this.log(`Initialising cron schedule ${this.expression}`)

    cron.schedule(this.expression, async () => {
      try {
        this.processQueueMails()
      } catch (e: any) {
        logger.error('Cron failed', {
          message: e.message,
          stack: e.stack,
        })
      }
    })
  }

  private async processQueueMails(): Promise<void> {
    const options: any = {}
    if (this.maxAttemps > 0) {
      options.where = {
        attempts: {
          [Op.lt]: this.maxAttemps,
        },
      }
    }
    const mails = await this.queueModel.findAll(options)
    this.log(`Sending queued mail, number: ${mails?.length}`)
    for (const mail of mails) {
      this.sendQueuedMail(mail as NsqMailQueue)
    }
  }

  private async sendQueuedMail(model: NsqMailQueue): Promise<void> {
    try {
      const message = this.composeMailFromModel(model)
      const result = await this.mailer.sendMail(message)
      if (!result.accepted) {
        throw new Error('Error sending mail')
      }

      // Remove from queue
      await model.destroy()
    } catch (e) {
      logger.error(`Error sending mail to ${model.email_to}`, model)

      model.update({
        last_error: JSON.stringify(e),
        attempts: model.attempts++,
      })
    }
  }

  private composeMailFromModel(mail: NsqMailQueue): Message {
    const message: Message = {
      from: mail.email_from,
      to: mail.email_to,
      subject: mail.subject,
      html: mail.html,
    }
    return message
  }

  private log(message: string, level = 'info'): void {
    if (this.logging) {
      logger.log(level, message)
    }
  }
}

export interface IScheduler {
  expression: string
  maxAttemps: number
  mailer: IMailer
  logging: boolean
}

function isCronValid(freq: string): boolean {
  const cronregex = new RegExp(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
  )
  return cronregex.test(freq)
}

export default Scheduler
