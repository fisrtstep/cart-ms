import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

// Async messaging over RabbitMQ. Every service publishes to one topic exchange,
// using the event type as routing key, and owns one durable queue for what it consumes.
// Envelope: { id, type, source, occurredAt, data }
export const EXCHANGE = 'shop.events';

let connection;
let channel;

export async function connect() {
    if (!process.env.RABBITMQ_URL) throw new Error('RABBITMQ_URL is not set');
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createConfirmChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    connection.on('close', () => console.error('RabbitMQ connection closed'));
}

// Resolves once the broker has confirmed the message.
export async function publish(type, data) {
    if (!channel) throw new Error('events channel is not connected');
    const event = { id: randomUUID(), type, source: process.env.MS_NAME, occurredAt: new Date().toISOString(), data };
    channel.publish(EXCHANGE, type, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        type,
    });
    await channel.waitForConfirms();
    return event;
}

// handlers: { [eventType]: async (data, event) => void }
// Messages whose handler throws are dead-lettered to `<queue>.dlq` instead of being retried forever.
export async function subscribe(queue, handlers) {
    if (!channel) throw new Error('events channel is not connected');
    const dlq = `${queue}.dlq`;
    await channel.assertQueue(dlq, { durable: true });
    await channel.assertQueue(queue, {
        durable: true,
        arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': dlq },
    });
    for (const type of Object.keys(handlers)) {
        await channel.bindQueue(queue, EXCHANGE, type);
    }
    await channel.prefetch(10);
    await channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
            const event = JSON.parse(msg.content.toString());
            const handler = handlers[event.type];
            if (handler) await handler(event.data, event);
            channel.ack(msg);
        } catch (err) {
            console.error(`failed to handle ${msg.fields.routingKey}`, err);
            channel.nack(msg, false, false);
        }
    });
}

export async function close() {
    await channel?.close();
    await connection?.close();
}
