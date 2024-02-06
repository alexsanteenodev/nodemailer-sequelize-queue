import QueueModel, { AddQueueModelAttributes, IQueueModel, IQueueModelStatic } from './QueueModel'
import { Sequelize, Model, Dialect } from 'sequelize'
import Scheduler from './Scheduler'
import Mailer from './Mailer'
import { MailProcessor } from './MailProcessor'

export default class NodemailerSequelizeQueue implements INodemailerSequelizeQueue {
  public queueModel: IQueueModelStatic
  private sequelize: Sequelize
  private dbInisializated: boolean
  private scheduled: boolean
  private smtpCredentials: any
  private options: Options
  private mailer: Mailer

  constructor(dbConfigInstance: DbCongifInstance, smtpCredentials: any, options?: Options) {
    this.initDatabase(dbConfigInstance)
    this.smtpCredentials = smtpCredentials
    this.options = options
    this.scheduled = false
    this.mailer = new Mailer(smtpCredentials)
  }

  private async initDatabase(dbConfigInstance: DbCongifInstance): Promise<void> {
    this.sequelize = dbConfigInstance.sequelize
      ? dbConfigInstance.sequelize
      : new Sequelize(
          dbConfigInstance.config.database,
          dbConfigInstance.config.username,
          dbConfigInstance.config.password,
          {
            host: dbConfigInstance.config.host,
            dialect: dbConfigInstance.config.dialect,
            logging: dbConfigInstance.config.logging,
          }
        )
  }

  public async initScheduler({ queueLimit = 100 }: InitSchedulerProps): Promise<void> {
    if (!this.dbInisializated) {
      await this.initModels()
    }

    if (this.scheduled) {
      return
    }

    const mailProcessor = new MailProcessor(
      this.queueModel,
      this.mailer,
      this.options.maxAttempts,
      this.options.logging,
      queueLimit
    )

    this.scheduled = true
    new Scheduler(
      this.smtpCredentials,
      this.queueModel,
      this.options.expression,
      this.options.maxAttempts,
      this.options.logging,
      queueLimit,
      mailProcessor
    )
  }

  public async initModels(): Promise<void> {
    this.queueModel = QueueModel(this.sequelize)

    // Creates table if not exist
    await this.queueModel.sync({
      // eslint-disable-next-line no-console
      logging: console.log,
      force: false,
    })
    this.dbInisializated = true
  }

  async queueMail(data: AddQueueModelAttributes): Promise<IQueueModel | void> {
    if (this.options.sendImmidiatly) {
      const message = this.mailer.composeMailFromModel(data)
      try {
        await this.mailer.sendMail(message)
      } catch (e) {
        const queueEntity = await this.queueModel.create(data, {
          returning: true,
        })
        return queueEntity
      }
      return
    }

    await this.initModels()

    const queueEntity = await this.queueModel.create(data, {
      returning: true,
    })
    if (!queueEntity.get('id')) {
      throw new Error('Error queueing email')
    }
    return queueEntity
  }
}

export interface INodemailerSequelizeQueue {
  queueModel: IQueueModelStatic
  queueMail(data: AddQueueModelAttributes): Promise<Model<any, any> | void>
  initScheduler(props?: { queueLimit?: number }): Promise<void>
}

export type DbConfig = {
  username: string
  password: string
  database: string
  host: string
  dialect: Dialect
  logging?: boolean | ((sql: string, timing?: number) => void)
}

export type DbCongifInstance = {
  config?: DbConfig
  sequelize?: Sequelize
}

export type Options = {
  maxAttempts?: number
  expression?: string
  logging?: boolean
  sendImmidiatly?: boolean
}

export type InitSchedulerProps = {
  queueLimit?: number
}
