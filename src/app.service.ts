import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommandInput,
  ReceiveMessageCommandInput,
} from '@aws-sdk/client-sqs';
@Injectable()
export class AppService {
  private sqsClient: SQSClient;

  constructor(private configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }
  async sendMessage(messageBody: string) {
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
    const jsonStrifyArraysUsers: string = JSON.stringify(
      [...arraysUsers, { message: messageBody }],
      null,
      2,
    );
    const params: SendMessageCommandInput = {
      QueueUrl: this.configService.get<string>('SQS_QUEUE_URL'),
      MessageBody: jsonStrifyArraysUsers,
    };

    const command = new SendMessageCommand(params);
    await this.sqsClient.send(command);
    return {
      message: 'created successfully',
    };
  }

  async receiveMessage(): Promise<any> {
    const params: ReceiveMessageCommandInput = {
      QueueUrl: this.configService.get<string>('SQS_QUEUE_URL'),
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30, // Tiempo de visibilidad en segundos
    };

    const command = new ReceiveMessageCommand(params);
    const result = await this.sqsClient.send(command);
    if (result.Messages && result.Messages.length > 0) {
      const { ReceiptHandle, Body } = result.Messages[0];
      await this.deleteMessage(ReceiptHandle);
      return {
        status: 'Message received',
        body: Body,
        receiptHandle: ReceiptHandle,
        receiptHandleIsDeleted: true,
      };
    }
    return {
      status: 'Message not received',
      body: null,
      receiptHandle: null,
      receiptHandleIsDeleted: null,
    };
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const params = {
      QueueUrl: this.configService.get<string>('SQS_QUEUE_URL'),
      ReceiptHandle: receiptHandle,
    };

    const command = new DeleteMessageCommand(params);
    await this.sqsClient.send(command);
  }
}
