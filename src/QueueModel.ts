import { Sequelize, DataTypes, ModelStatic, Model, Optional } from 'sequelize'

export class NsqMailQueue extends Model implements IQueueModel {
  declare id: number
  declare email_from: string
  declare email_to: string
  declare subject: string
  declare html: string
  declare attachments?: any
  declare attempts?: number
  declare last_error?: string
}

export default (sequelize: Sequelize): IQueueModelStatic => {
  NsqMailQueue.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER({ decimals: 11 }),
      },
      email_from: {
        type: DataTypes.STRING(155),
        allowNull: false,
      },
      email_to: {
        type: DataTypes.STRING(155),
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      html: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
      },
      attachments: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      attempts: {
        type: DataTypes.INTEGER({ decimals: 11 }),
        defaultValue: 0,
      },
      last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      modelName: 'NsqMailQueue',
      tableName: 'nsq_mail_queue',
      underscored: false,
      timestamps: true,
      sequelize, // passing the `sequelize` instance is required
    }
  )
  return NsqMailQueue
}

export type AddQueueModelAttributes = {
  email_from: string
  email_to: string
  subject: string
  html: string
  attachments?: any
}

export type QueueModelAttributes = {
  id: number
  email_from: string
  email_to: string
  subject: string
  html: string
  attachments?: any
  attempts?: number
  last_error?: string
}

export type IQueueModel = Model<QueueModelAttributes, QueueModelCreationAttributes>
export type IQueueModelStatic = ModelStatic<IQueueModel>
export type QueueModelCreationAttributes = Optional<QueueModelAttributes, 'id'>
export type INsqMailQueue = typeof NsqMailQueue
