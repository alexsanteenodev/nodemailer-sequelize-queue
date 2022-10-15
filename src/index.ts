import QueueModel, { AddQueueModelAttributes, IQueueModel, IQueueModelStatic } from './QueueModel'
import { Sequelize, Model, Dialect } from 'sequelize'
import Scheduler from './Scheduler'

export default class NodemailerSequelizeQueue implements INodemailerSequelizeQueue {
  private queueModel: IQueueModelStatic
  private sequelize: Sequelize
  private dbInisializated: boolean
  private smtpCredentials: any
  private options: Options

  constructor(dbConfigInstance: DbCongifInstance, smtpCredentials: any, options?: Options) {
    this.initDatabase(dbConfigInstance)
    this.smtpCredentials = smtpCredentials
    this.options = options
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

  public async initScheduler(): Promise<void> {
    if (!this.dbInisializated) {
      await this.initModels()
    }
    new Scheduler(
      this.smtpCredentials,
      this.queueModel,
      this.options.expression,
      this.options.maxAttempts,
      this.options.logging
    )
  }

  private async initModels(): Promise<void> {
    this.queueModel = QueueModel(this.sequelize)

    // Creates table if not exist
    await this.queueModel.sync({
      logging: console.log,
      force: false,
    })
    this.dbInisializated = true
  }

  async queueMail(data: AddQueueModelAttributes): Promise<IQueueModel> {
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
  queueMail(data: AddQueueModelAttributes): Promise<Model<any, any>>
  initScheduler(): Promise<void>
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
}
