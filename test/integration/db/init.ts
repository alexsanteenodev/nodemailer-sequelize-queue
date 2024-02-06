import dotenv from 'dotenv'
dotenv.config()
import NodemailerSequelizeQueue, { INodemailerSequelizeQueue } from '../../../src'

const auth = {
  user: process.env.smtp_user,
  pass: process.env.smtp_pass,
}
export const smtpCreds = {
  host: process.env.smtp_host,
  port: process.env.smtp_port ? process.env.smtp_port : 465,
  secure: true,
  auth: auth,
}

export const dbCredentials = {
  // See https://www.npmjs.com/package/sequelize for more options
  config: {
    username: process.env.db_username || '',
    password: process.env.db_password || '',
    database: process.env.db_database || '',
    host: process.env.db_host || '',
    dialect: 'mysql' as any,
  },
  // Alternatively you can use existing sequelize instance
  // sequelize: SequelizeInstane
}
export async function initNodeMailer(): Promise<INodemailerSequelizeQueue> {
  // See https://www.npmjs.com/package/nodemailer for more options

  // Create NodemailerSequelizeQueue instance
  const queue = new NodemailerSequelizeQueue(dbCredentials, smtpCreds, {
    // See https://www.npmjs.com/package/nodemailer for more expression options
    expression: '*/1 * * * *',
    // If -1, will try infinite times
    maxAttempts: 2,
    logging: true,
  })
  await queue.initModels()
  await queue.queueModel.destroy({
    where: {},
    truncate: true,
  })

  return queue
}
