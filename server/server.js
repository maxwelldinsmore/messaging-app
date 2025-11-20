require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AWS SNS Client
const sns = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  },
});

const TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const FUNCTION_URL = process.env.FUNCTION_URL;

// Store messages in memory
let messagesCache = [];
let lastPollTime = Date.now();

// Poll Lambda function for messages
const pollLambdaMessages = async () => {
  console.log('🔄 Polling Lambda for messages...');
  try {
    if (!FUNCTION_URL) {
      console.warn('⚠️ FUNCTION_URL not configured');
      return;
    }

    console.log('🌐 Fetching from:', FUNCTION_URL);
    const response = await fetch(FUNCTION_URL);
    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📦 Received data:', JSON.stringify(data, null, 2));
      console.log('📦 Data type:', typeof data);
      console.log('📦 Is Array:', Array.isArray(data));
      console.log('📦 Has messages property:', !!data.messages);
      
      // Handle both formats: {messages: [...]} or just [...]
      let messagesArray = [];
      if (Array.isArray(data)) {
        messagesArray = data;
        console.log('📨 Data is directly an array with', messagesArray.length, 'items');
      } else if (data.messages && Array.isArray(data.messages)) {
        messagesArray = data.messages;
        console.log(`📨 Found ${messagesArray.length} messages in data.messages`);
      } else {
        console.log('⚠️ Data is not in expected format');
      }
      
      if (messagesArray.length > 0) {
        // Add new messages to cache
        messagesArray.forEach((msg) => {
          console.log('🔍 Processing raw message:', JSON.stringify(msg, null, 2));
          
          // Parse the Message field if it's a JSON string (SNS notification format)
          let parsedMessage = msg;
          if (msg.Message && typeof msg.Message === 'string') {
            try {
              parsedMessage = JSON.parse(msg.Message);
              parsedMessage.MessageId = msg.MessageId;
              parsedMessage.Timestamp = msg.Timestamp;
              console.log('✂️ Parsed SNS message:', parsedMessage);
            } catch (e) {
              console.error('Failed to parse message:', e);
            }
          }
          
          const messageId = parsedMessage.MessageId || parsedMessage.id || `${parsedMessage.timestamp}-${parsedMessage.name}`;
          const exists = messagesCache.some(m => m.id === messageId);
          
          console.log('🆔 Message ID:', messageId, '| Already exists:', exists);
          
          if (!exists) {
            const newCacheMessage = {
              id: messageId,
              name: parsedMessage.name,
              message: parsedMessage.message,
              timestamp: parsedMessage.timestamp || parsedMessage.Timestamp,
              isSent: false,
            };
            console.log('✅ Adding new message to cache:', newCacheMessage);
            messagesCache.push(newCacheMessage);
            console.log('📊 Cache now has', messagesCache.length, 'messages');
          }
        });
      } else {
        console.log('ℹ️ No messages to process');
      }
    } else {
      console.error('❌ Response not OK:', response.status);
    }
  } catch (error) {
    console.error('❌ Error polling Lambda:', error);
  }
};

// Start polling interval
setInterval(pollLambdaMessages, 5000);
pollLambdaMessages(); // Initial poll

// Get messages endpoint
app.get('/api/messages', (req, res) => {
  console.log(`📤 Sending ${messagesCache.length} messages to client`);
  res.json({ messages: messagesCache });
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

    if (!TOPIC_ARN) {
      return res.status(500).json({ 
        error: 'SNS Topic ARN not configured' 
      });
    }

    console.log('📍 Topic ARN:', TOPIC_ARN);

    // Fix the Topic ARN if it has the subscription UUID appended
    let fixedTopicArn = TOPIC_ARN;
    if (TOPIC_ARN.includes('.fifo:')) {
      fixedTopicArn = TOPIC_ARN.split(':').slice(0, 6).join(':');
      console.log('🔧 Fixed Topic ARN:', fixedTopicArn);
    }

    // Prepare message for SNS
    const messageBody = {
      name,
      message,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Check if FIFO topic
    const isFifoTopic = fixedTopicArn.endsWith('.fifo');
    
    const publishParams = {
      TopicArn: fixedTopicArn,
      Message: JSON.stringify(messageBody),
    };

    // Add required parameters for FIFO topics
    if (isFifoTopic) {
      publishParams.MessageGroupId = 'messaging-app-group';
      publishParams.MessageDeduplicationId = `${Date.now()}-${Math.random()}`;
      console.log('📨 FIFO topic detected, adding required parameters');
    }

    console.log('📤 Publishing to SNS with params:', { ...publishParams, Message: 'redacted' });

    // Send message to SNS
    const snsResponse = await sns.send(new PublishCommand(publishParams));

    console.log('Message sent to SNS:', {
      messageId: snsResponse.MessageId,
      name,
      timestamp: messageBody.timestamp,
    });

    res.json({
      success: true,
      messageId: snsResponse.MessageId,
      message: 'Message sent successfully to SNS',
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
  console.log(`SNS Topic ARN configured: ${!!TOPIC_ARN}`);
  console.log(`Lambda Function URL configured: ${!!FUNCTION_URL}`);
  console.log(`⏰ Polling Lambda every 5 seconds`);
});
