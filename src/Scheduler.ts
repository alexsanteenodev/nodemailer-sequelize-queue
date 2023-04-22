// import cron from 'node-cron'
import { CronJob } from 'cron'
import { Op } from 'sequelize'
import Mailer, { IMailer } from './Mailer'
import { IQueueModelStatic, NsqMailQueue } from './QueueModel'
import logger from './utils/logger'
import { generateRandom } from './utils/generateRandom'

class Scheduler implements IScheduler {
  expression: string
  maxAttemps: number
  mailer: IMailer
  logging: boolean
  limit: number
  private queueModel: IQueueModelStatic

  constructor(
    smtpCredentials: any,
    queueModel: IQueueModelStatic,
    expression = '0 */1 * * *',
    maxAttemps = -1,
    logging = false,
    limit = 100,
    mailer?: IMailer
  ) {
    if (!isCronValid(expression)) {
      throw new Error('Cron expression is invalid')
    }
    this.limit = limit
    this.expression = expression
    this.maxAttemps = maxAttemps
    this.logging = logging

    this.runJobs()

    this.queueModel = queueModel

    this.mailer = mailer || new Mailer(smtpCredentials)
  }

  private async runJobs() {
    this.log(`Initialising cron schedule ${this.expression}`)

    await new Promise((resolve) => setTimeout(resolve, generateRandom(500, 2500)))
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const job = new CronJob(this.expression, function () {
      self.processQueueMails().catch((e) => {
        logger.error('Cron failed', {
          message: e.message,
          stack: e.stack,
        })
      })
    })
    job.start()
  }

  private async processQueueMails(): Promise<void> {
    const transaction = await this.queueModel.sequelize.transaction()
    const options: any = {
      transaction: transaction,
      lock: true,
      limit: this.limit,
    }
    try {
      if (this.maxAttemps > 0) {
        options.where = {
          attempts: {
            [Op.lt]: this.maxAttemps,
          },
        }
      }
      const mails = await this.queueModel.findAll(options)
      // Remove from queue(prevents duplicate sends with multiple workers)

      const models = []
      for (const mail of mails) {
        const model = this.sendQueuedMail(mail as NsqMailQueue)
        models.push(model)
      }

      await Promise.all(models)
      await transaction.commit()
    } catch (e) {
      await transaction.rollback()
      throw e
    }
  }

  private async sendQueuedMail(model: NsqMailQueue): Promise<NsqMailQueue> {
    try {
      const message = this.mailer.composeMailFromModel(model)
      const result = await this.mailer.sendMail(message)
      if (!result.accepted) {
        throw new Error('Error sending mail')
      }

      // Remove from queue
      await this.queueModel.destroy({
        where: {
          id: model.id,
        },
      })
      this.log(`Deleted mail from queue ${model.id}`, 'debug')

      return model
    } catch (e) {
      logger.error(`Error sending mail to ${model.email_to}`, { model, error: e })
      model.update(
        {
          last_error: JSON.stringify(e),
          attempts: model.attempts + 1,
        },
        {
          where: {
            id: model.id,
          },
        }
      )
      return model
    }
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

export type LockType = 'transaction'

export default Scheduler
