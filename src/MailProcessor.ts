import { IMailer } from './Mailer'
import { IQueueModelStatic, NsqMailQueue } from './QueueModel'
import logger from './utils/logger'
import { Op } from 'sequelize'
import { v4 as uuid } from 'uuid'

export class MailProcessor {
  expression: string
  maxAttemps: number
  mailer: IMailer
  logging: boolean
  limit: number
  private queueModel: IQueueModelStatic

  constructor(
    queueModel: IQueueModelStatic,
    mailer: IMailer,
    maxAttemps = -1,
    logging = false,
    limit = 100
  ) {
    this.limit = limit
    this.maxAttemps = maxAttemps
    this.logging = logging

    this.queueModel = queueModel

    this.mailer = mailer
  }
  public async processQueueMails(): Promise<void> {
    const options: any = {
      limit: this.limit,
    }

    const worker_uuid = uuid()
    try {
      if (this.maxAttemps > 0) {
        options.where = {
          attempts: {
            [Op.lt]: this.maxAttemps,
          },
        }
      }

      // Lock the rows
      await this.queueModel.update(
        {
          worker_uuid,
        },
        {
          where: {
            ...options.where,
            worker_uuid: null,
          },
        }
      )

      // Get the rows of the worker
      options.where = {
        ...options.where,
        worker_uuid,
      }

      const mails = await this.queueModel.findAll(options)
      // Remove from queue(prevents duplicate sends with multiple workers)

      const models = []
      for (const mail of mails) {
        const model = this.sendQueuedMailAndDeleteRow(mail as NsqMailQueue)
        models.push(model)
      }

      await Promise.all(models)
    } catch (e) {
      // reset worker_uuid
      await this.queueModel.update(
        {
          worker_uuid: null,
        },
        {
          where: {
            worker_uuid,
          },
        }
      )
      throw e
    }
  }

  private async sendQueuedMailAndDeleteRow(model: NsqMailQueue): Promise<NsqMailQueue> {
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
    } catch (err: unknown) {
      const e = err as Error
      logger.error(`Error sending mail to ${model.email_to}`, {
        model,
        error: e.message,
        stack: e.stack,
      })
      await model.update(
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
