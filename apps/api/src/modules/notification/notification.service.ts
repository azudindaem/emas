import { Injectable } from '@nestjs/common'
import { OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@emas/db'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import {
  NotificationChannelDto,
  SendNotificationDto,
  UpsertNotificationConfigDto,
} from './dto/notification.dto'

@Injectable()
export class NotificationService implements OnModuleDestroy {
  private readonly redis = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  })

  private readonly queue = new Queue('notification', {
    connection: this.redis,
  })

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    await this.queue.close()
    await this.redis.quit()
  }

  async listConfigs(tenantId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.notificationConfig.findMany({
      where: { tenantId },
      orderBy: { channel: 'asc' },
    })

    return rows as unknown as Record<string, unknown>[]
  }

  async upsertConfig(
    tenantId: string,
    dto: UpsertNotificationConfigDto,
  ): Promise<Record<string, unknown>> {
    const row = await this.prisma.notificationConfig.upsert({
      where: {
        tenantId_channel: {
          tenantId,
          channel: dto.channel,
        },
      },
      create: {
        tenantId,
        channel: dto.channel,
        settings: dto.settings as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
      update: {
        settings: dto.settings as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    })

    return row as unknown as Record<string, unknown>
  }

  async send(tenantId: string, dto: SendNotificationDto): Promise<Record<string, unknown>> {
    const job = await this.queue.add(
      'send',
      {
        tenantId,
        channel: dto.channel,
        recipient: dto.recipient,
        templateId: dto.templateId,
        subject: dto.subject,
        variables: dto.variables,
      },
      {
        attempts: 3,
        removeOnComplete: 200,
        removeOnFail: 200,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    )

    return {
      queued: true,
      jobId: job.id,
      queue: 'notification',
    }
  }
}
