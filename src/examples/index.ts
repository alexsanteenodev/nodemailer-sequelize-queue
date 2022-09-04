import NodemailerSequelizeQueue from '../index'
import dotenv from 'dotenv'
dotenv.config()
import path from 'path'

// Use google smtp key
const googleKey = process.env.smtp_google_key
  ? require(path.join(process.cwd(), `./${process.env.smtp_google_key}`))
  : {}

const auth =
  process.env.smtp_host === 'smtp.gmail.com'
    ? //Use google smtp
      {
        type: 'OAuth2',
        user: process.env.smtp_user,
        serviceClient: googleKey.client_id,
        privateKey: googleKey.private_key,
      }
    : //Use default smtp
      {
        user: process.env.smtp_user,
        pass: process.env.smtp_pass,
      }

// See https://www.npmjs.com/package/nodemailer for more options
const smtpCreds = {
  host: process.env.smtp_host,
  port: process.env.smtp_port ? process.env.smtp_port : 465,
  secure: true,
  auth: auth,
}

const dbCredentials = {
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

// Create NodemailerSequelizeQueue instance
const queue = new NodemailerSequelizeQueue(dbCredentials, smtpCreds, {
  // See https://www.npmjs.com/package/nodemailer for more expression options
  expression: '*/1 * * * *',
  // If -1, will try infinite times
  maxAttempts: 2,
})

//  Run cron schedule for sending mail (Only one time in root of the system)
queue.initScheduler()

// Add mail to queue
queue.queueMail({
  email_from: 'alexsanteeno@gmail.com',
  email_to: 'alexsanteeno@gmail.com',
  subject: 'test subject',
  html: 'test message',
})
