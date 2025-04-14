import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
} from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AppService {
  private sqsClient: SQSClient;

  constructor(private configService: ConfigService) {
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
  async sendMessage() {
    const arraysUsers = [
      {
        id: 1,
        name: 'Carlos',
        lastname: 'Garcia',
      },
      {
        id: 2,
        name: 'Carlos',
        lastname: 'Garcia',
      },
    ];
    const response = await Promise.all(
      arraysUsers.map((data) => {
        const MessageBody: string = JSON.stringify(data, null, 2);
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
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30,
    };

    const command = new ReceiveMessageCommand(params);
    const result = await this.sqsClient.send(command);

    const processed: any[] = [];

    if (result.Messages && result.Messages.length > 0) {
      for (const msg of result.Messages) {
        const { ReceiptHandle, Body } = msg;
        Logger.debug({
          msg,
        });
        await this.deleteMessage(ReceiptHandle);
        processed.push({
          body: JSON.parse(Body || '{}'),
          receiptHandle: ReceiptHandle,
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
