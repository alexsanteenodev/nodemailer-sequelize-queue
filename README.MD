# Nodemailer sequelize queue

[Npm package](https://www.npmjs.com/package/nodemailer-sequelize-queue)

### This package allows to queue email and process it later by schedule using [Nodemailer](https://www.npmjs.com/package/nodemailer) for sending mails, [Sequelize](https://www.npmjs.com/package/sequelize) for save queue to database and [Node cron](https://www.npmjs.com/package/sequelize) for scheduling.

## Getting Started

Install nodemailer-sequelize-queue using npm:

```console
npm i nodemailer-sequelize-queue
```

or use yarn

```console
yarn add nodemailer-sequelize-queue
```

## Usage

1. Create NodemailerSequelizeQueue instance

```console
import NodemailerSequelizeQueue from 'nodemailer-sequelize-queue'

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
// See https://www.npmjs.com/package/nodemailer for more options
const smtpCreds = {
  host: process.env.smtp_host,
  port: process.env.smtp_port ? process.env.smtp_port : 465,
}

const queue = new NodemailerSequelizeQueue(
  dbCredentials,
  smtpCreds,
  {
  // See https://www.npmjs.com/package/nodemailer for more expression options
  expression: '*/1 * * * *',
  // If -1, will try infinite times
  maxAttempts: 2,
  }
)
```

2. Run cron schedule for sending mail (Only one time in root of the system)

```console
queue.initScheduler()
```

3. Add mail to queue

```console
queue.queueMail({
  email_from: 'test@gmail.com',
  email_to: 'test@gmail.com',
  subject: 'test subject',
  html: 'test message',
  attachments: [
    {
      // Not required (see Nodemailer filename prop)
      filename: 'file.jpg',
      // Local or remote url (see Nodemailer path prop)
      path: 'https://picsum.photos/id/237/200/300',
    },
    ]
})
```

## License

The MIT License (MIT). Please see [License File](https://github.com/alexchernishov/nodemailer-sequelize-queue/blob/master/LICENSE) for more information.
