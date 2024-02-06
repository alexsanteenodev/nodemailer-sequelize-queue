import { INodemailerSequelizeQueue } from '../../src'
import { v4 as uuid } from 'uuid'

export async function queueMailWithUuid(nodemailerSequelizeQueue: INodemailerSequelizeQueue) {
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
  return UUID
}
