# Messaging App with Amazon SQS Integration

A full-stack application that allows users to send messages through a React frontend, which are then queued to Amazon SQS via an Express.js API.

## Features

- 📨 Clean, modern React UI for sending messages
- 🚀 Express.js API server
- ☁️ Amazon SQS integration for message queuing
- ✅ Real-time status feedback
- 🎨 Responsive design with gradient styling

## Project Structure

```
messaging-app/
├── client/           # React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── server/           # Express.js backend
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- AWS Account with SQS access
- AWS Access Key ID and Secret Access Key

## AWS Setup

### 1. Create an SQS Queue

1. Log in to AWS Console
2. Navigate to Amazon SQS
3. Click "Create queue"
4. Choose "Standard" queue type
5. Enter a queue name (e.g., `messaging-app-queue`)
6. Keep default settings or customize as needed
7. Click "Create queue"
8. Copy the Queue URL (you'll need this later)

### 2. Create IAM User with SQS Permissions

1. Go to IAM in AWS Console
2. Create a new user with programmatic access
3. Attach the policy `AmazonSQSFullAccess` or create a custom policy with these permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "sqs:SendMessage",
           "sqs:GetQueueUrl"
         ],
         "Resource": "arn:aws:sqs:*:*:*"
       }
     ]
   }
   ```
4. Save the Access Key ID and Secret Access Key

## Installation

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   copy .env.example .env
   ```

4. Edit `.env` and add your AWS credentials:
   ```env
   PORT=5000
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_actual_access_key_id
   AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
   AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/your-queue-name
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

```bash
cd server
npm start
```

The server will run on `http://localhost:5000`

For development with auto-restart:
```bash
npm run dev
```

### Start the Frontend

In a new terminal:

```bash
cd client
npm start
```

The React app will open in your browser at `http://localhost:3000`

## Usage

1. Open the app in your browser (`http://localhost:3000`)
2. Enter your name in the "Your Name" field
3. Type your message in the "Message" text area
4. Click "Send Message"
5. You'll see a success or error message indicating whether the message was sent to SQS

## API Endpoints

### `GET /api/health`
Health check endpoint to verify the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### `POST /api/send-message`
Sends a message to the configured SQS queue.

**Request Body:**
```json
{
  "name": "John Doe",
  "message": "Hello, World!",
  "timestamp": "2025-11-13T12:00:00.000Z"
}
```

**Success Response:**
```json
{
  "success": true,
  "messageId": "abc123-def456-...",
  "message": "Message sent successfully to SQS"
}
```

**Error Response:**
```json
{
  "error": "Failed to send message",
  "details": "Error description"
}
```

## Verifying Messages in SQS

1. Go to AWS SQS Console
2. Select your queue
3. Click "Send and receive messages"
4. Click "Poll for messages" to see messages in the queue
5. Click on a message to view its contents

## Technologies Used

- **Frontend:**
  - React 18
  - CSS3 with animations
  
- **Backend:**
  - Node.js
  - Express.js
  - AWS SDK for JavaScript v3 (@aws-sdk/client-sqs)
  - CORS
  - dotenv

## Troubleshooting

### Messages not appearing in SQS
- Verify your AWS credentials are correct in `.env`
- Check that the Queue URL is correct
- Ensure your IAM user has the necessary SQS permissions
- Check the server logs for error messages

### CORS errors
- Make sure the backend server is running
- Verify the proxy setting in `client/package.json` points to the correct backend URL

### Connection refused
- Ensure both frontend and backend servers are running
- Check that the ports 3000 and 5000 are not being used by other applications

## Security Notes

⚠️ **Important:** Never commit your `.env` file to version control. It contains sensitive AWS credentials.

For production:
- Use AWS IAM roles instead of access keys when possible
- Implement proper authentication and authorization
- Use environment variables or AWS Secrets Manager for credentials
- Enable HTTPS
- Add rate limiting to prevent abuse

## License

ISC

## Contributing

Feel free to submit issues and pull requests!
