import dotenv from 'dotenv'
import { initNodeMailer } from './db/init'
import { INodemailerSequelizeQueue } from '../../src'
import { v4 as uuid } from 'uuid'
dotenv.config()

let nodemailerSequelizeQueue: INodemailerSequelizeQueue
beforeAll(async () => {
  nodemailerSequelizeQueue = await initNodeMailer()
})

afterAll(async () => {
  await nodemailerSequelizeQueue.queueModel.sequelize.close()
})

describe('QueueMail', () => {
  it('should queue a mail', async () => {
    //  Run cron schedule for sending mail (Only one time in root of the system)

    const UUID = uuid()
    // Add mail to queue
    await nodemailerSequelizeQueue.queueMail({
      email_from: 'test@gmail.com',
      email_to: 'test@gmail.com',
      subject: UUID,
      html: 'test message',

      attachments: [
        {
          // Not required (see Nodemailer filename prop)
          filename: 'file.jpg',
          // Local or remote url (see Nodemailer path prop)
          path: 'https://picsum.photos/id/237/200/300',
        },
      ],
    })

    const result = await nodemailerSequelizeQueue.queueModel.findAll()
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ subject: UUID })]))
  })
})
