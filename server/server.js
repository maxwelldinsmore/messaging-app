require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AWS SQS Client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Send message endpoint
app.post('/api/send-message', async (req, res) => {
  try {
    const { name, message, timestamp } = req.body;

    // Validate input
    if (!name || !message) {
      return res.status(400).json({ 
        error: 'Name and message are required' 
      });
    }

    if (!QUEUE_URL) {
      return res.status(500).json({ 
        error: 'SQS Queue URL not configured' 
      });
    }

    // Prepare message for SQS
    const messageBody = {
      name,
      message,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Send message to SQS
    const isFifoQueue = QUEUE_URL.endsWith('.fifo');
    const sqsParams = {
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(messageBody),
      MessageAttributes: {
        Name: {
          DataType: 'String',
          StringValue: name,
        },
        Timestamp: {
          DataType: 'String',
          StringValue: messageBody.timestamp,
        },
      },
    };

    // Add required parameters for FIFO queues
    if (isFifoQueue) {
      sqsParams.MessageGroupId = 'messaging-app-group';
      sqsParams.MessageDeduplicationId = `${Date.now()}-${Math.random()}`;
    }

    const command = new SendMessageCommand(sqsParams);

    const response = await sqsClient.send(command);

    console.log('Message sent to SQS:', {
      messageId: response.MessageId,
      name,
      timestamp: messageBody.timestamp,
    });

    res.json({
      success: true,
      messageId: response.MessageId,
      message: 'Message sent successfully to SQS',
    });

  } catch (error) {
    console.error('Error sending message to SQS:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`SQS Queue URL configured: ${!!QUEUE_URL}`);
});
