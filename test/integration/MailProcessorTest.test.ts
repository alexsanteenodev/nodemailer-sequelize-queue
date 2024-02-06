import { initNodeMailer, smtpCreds } from './db/init'
import { INodemailerSequelizeQueue } from '../../src'
import { MailProcessor } from '../../src/MailProcessor'
import Mailer from '../../src/Mailer'
import nodemailer from 'nodemailer'
import { queueMailWithUuid } from './queueMailWithUuid'

jest.setTimeout(30000)
let nodemailerSequelizeQueue: INodemailerSequelizeQueue
jest.mock('nodemailer')

beforeAll(async () => {
  nodemailerSequelizeQueue = await initNodeMailer()
  // @ts-expect-error - mocking nodemailer
  nodemailer.createTransport.mockClear()
})

afterAll(async () => {
  await nodemailerSequelizeQueue.queueModel.sequelize.close()
})

describe('QueueMail', () => {
  it('should queue a mail', async () => {
    //  Run cron schedule for sending mail (Only one time in root of the system)
    const mockedSendMail = jest.fn().mockReturnValue({ accepted: ['1', '2'] })
    // @ts-expect-error - mocking nodemailer
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockedSendMail,
    })

    const UUID1 = await queueMailWithUuid(nodemailerSequelizeQueue)
    const UUID2 = await queueMailWithUuid(nodemailerSequelizeQueue)

    const result = await nodemailerSequelizeQueue.queueModel.findAll({
      where: {
        subject: [UUID1, UUID2],
      },
    })

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: UUID1 }),
        expect.objectContaining({ subject: UUID2 }),
      ])
    )

    const mailer1 = new Mailer(smtpCreds)
    const mailer2 = new Mailer(smtpCreds)

    // run 2 schedulers as separate workers. Ensure they not interfere with each other. Ensure nodemailer called twice
    const processor1 = new MailProcessor(nodemailerSequelizeQueue.queueModel, mailer1)
    const processor2 = new MailProcessor(nodemailerSequelizeQueue.queueModel, mailer2)

    await Promise.all([processor1.processQueueMails(), processor2.processQueueMails()])

    // expect sendMail to be called twice
    expect(mockedSendMail).toHaveBeenCalledTimes(2)
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(2)

    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: UUID1,
      })
    )
    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: UUID2,
      })
    )

    const result2 = await nodemailerSequelizeQueue.queueModel.findAll({
      where: {
        subject: [UUID1, UUID2],
      },
    })
    expect(result2).toHaveLength(0)
  })

  it('should update error', async () => {
    //  Run cron schedule for sending mail (Only one time in root of the system)
    const mockedSendMail = jest.fn().mockRejectedValue('Error sending mail')
    // @ts-expect-error - mocking nodemailer
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockedSendMail,
    })

    const UUID1 = await queueMailWithUuid(nodemailerSequelizeQueue)
    const UUID2 = await queueMailWithUuid(nodemailerSequelizeQueue)

    const mailer1 = new Mailer(smtpCreds)
    const mailer2 = new Mailer(smtpCreds)

    // run 2 schedulers as separate workers. Ensure they not interfere with each other. Ensure nodemailer called twice
    const processor1 = new MailProcessor(nodemailerSequelizeQueue.queueModel, mailer1)
    const processor2 = new MailProcessor(nodemailerSequelizeQueue.queueModel, mailer2)

    await Promise.all([processor1.processQueueMails(), processor2.processQueueMails()])

    // expect sendMail to be called twice
    expect(mockedSendMail).toHaveBeenCalledTimes(2)
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(4)

    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: UUID1,
      })
    )
    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: UUID2,
      })
    )

    const result2 = await nodemailerSequelizeQueue.queueModel.findAll({
      where: {
        subject: [UUID1, UUID2],
      },
    })

    expect(result2).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: UUID1,
          attempts: 1,
          last_error: '"Error sending mail"',
        }),
        expect.objectContaining({
          subject: UUID2,
          attempts: 1,
          last_error: '"Error sending mail"',
        }),
      ])
    )
  })
})
