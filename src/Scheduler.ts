// import cron from 'node-cron'
import { CronJob } from 'cron'
import { IQueueModelStatic } from './QueueModel'
import logger from './utils/logger'
import { generateRandom } from './utils/generateRandom'
import { MailProcessor } from './MailProcessor'

class Scheduler implements IScheduler {
  expression: string
  maxAttemps: number
  logging: boolean
  limit: number
  mailProcessor: MailProcessor
  private queueModel: IQueueModelStatic

  constructor(
    smtpCredentials: any,
    queueModel: IQueueModelStatic,
    expression = '0 */1 * * *',
    maxAttemps = -1,
    logging = false,
    limit = 100,
    mailProcessor: MailProcessor
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

    this.mailProcessor = mailProcessor
  }

  private async runJobs() {
    this.log(`Initialising cron schedule ${this.expression}`)

    await new Promise((resolve) => setTimeout(resolve, generateRandom(500, 2500)))
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const job = new CronJob(this.expression, function () {
      self.mailProcessor.processQueueMails().catch((e) => {
        logger.error('Cron failed', {
          message: e.message,
          stack: e.stack,
        })
      })
    })
    job.start()
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
  logging: boolean
  mailProcessor: MailProcessor
}

function isCronValid(freq: string): boolean {
  const cronregex = new RegExp(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
  )
  return cronregex.test(freq)
}

export type LockType = 'transaction'

export default Scheduler
