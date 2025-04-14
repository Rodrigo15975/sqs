import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
} from '@aws-sdk/client-sqs';
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout } from 'timers/promises';
@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly sqsClient: SQSClient;
  private isPolling = true;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async onModuleInit() {
    this.startPolling();
  }

  async onModuleDestroy() {
    this.isPolling = false;
  }

  private async startPolling() {
    Logger.log('🟢 Iniciando polling de mensajes...');
    while (this.isPolling) {
      try {
        const result = await this.receiveMessage();
        if (result.count > 0) {
          Logger.log(`📩 Mensajes recibidos: ${result.count}`);
        }
      } catch (error) {
        Logger.error('Error en el polling de mensajes', error);
      }

      Logger.log('🔴 Polling detenido.');

      await setTimeout(5000);
    }
    Logger.log('🔴 Polling detenido.');
  }

  async sendMessage() {
    const arraysUsers = [
      { id: 1, name: 'Carlos', lastname: 'Garcia' },
      { id: 2, name: 'Carlos', lastname: 'Garcia' },
    ];
    const response = await Promise.all(
      arraysUsers.map((data) => {
        const MessageBody: string = JSON.stringify(data);
        const params: SendMessageCommandInput = {
          QueueUrl: this.configService.getOrThrow<string>('SQS_QUEUE_URL'),
          MessageBody,
        };
        const command = new SendMessageCommand(params);
        return this.sqsClient.send(command);
      }),
    );
    return {
      response,
      message: 'created successfully',
    };
  }

  async receiveMessage(): Promise<any> {
    const params: ReceiveMessageCommandInput = {
      QueueUrl: this.configService.getOrThrow<string>('SQS_QUEUE_URL'),
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 30,
    };

    const command = new ReceiveMessageCommand(params);
    const result = await this.sqsClient.send(command);

    const processed: any[] = [];

    if (result.Messages && result.Messages.length > 0) {
      for (const msg of result.Messages) {
        const { ReceiptHandle, Body } = msg;
        Logger.debug({ msg });
        await this.deleteMessage(ReceiptHandle);
        processed.push({
          data: JSON.parse(Body),
        });
      }
    }

    return {
      status: processed.length > 0 ? 'Messages received' : 'No messages',
      count: processed.length,
      messages: processed,
    };
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const params = {
      QueueUrl: this.configService.getOrThrow<string>('SQS_QUEUE_URL'),
      ReceiptHandle: receiptHandle,
    };
    const command = new DeleteMessageCommand(params);
    await this.sqsClient.send(command);
  }
}
