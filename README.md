# Aura Skincare AI Voice Customer Support Agent

A browser-based, AI-powered voice customer support agent built for **Aura Skincare**. The application enables customers to interact with a virtual assistant through natural voice conversations to track orders, ask delivery questions, understand brand policies, and receive customer support.

**Aria**, the AI voice assistant, combines conversational AI, browser speech technologies, mock order management, and structured post-call summaries to simulate a real-world customer experience (CX) support system.

## Live Demo

**Live Application:** https://aura-skincare-ai-voice-agent-steel.vercel.app/

**GitHub Repository:** https://github.com/AnuSaha545/aura-skincare-ai-voice-agent

**Deployment:**
- Frontend: Vercel
- Backend: Render
- AI Provider: Groq

## Features

- **Voice Conversations:** Customers can speak directly to Aria using their browser microphone and receive spoken responses.
- **AI-Powered Customer Support:** Groq generates conversational, context-aware responses.
- **Order Tracking:** Customers can retrieve mock order details using order IDs.
- **Policy-Aware Assistance:** Aria explains shipping, delivery, returns, cancellations, and Cash on Delivery (COD) policies.
- **Conversation Context:** Maintains recent conversation history for multi-turn interactions.
- **Live Conversation Transcript:** Displays interactions between the customer and Aria.
- **Post-Call Summaries:** Generates structured summaries after a call ends.
- **Call State Indicators:** Displays listening, thinking, and speaking states during interactions.
- **Error Handling:** Handles invalid order IDs and API failures without falsely confirming unsupported actions.
- **Responsive Interface:** Browser-based interface for customer support interactions.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| AI Provider | Groq API |
| AI Model | `openai/gpt-oss-20b` |
| Speech Recognition | Web Speech Recognition API |
| Speech Synthesis | Web Speech Synthesis API |
| API Communication | REST APIs |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Version Control | Git, GitHub |

## System Architecture

The application follows a client-server architecture, separating voice interaction, AI processing, and order management.

```text
                  Customer
                     |
                     v
            React + Vite Frontend
                     |
          +----------+-----------+
          |                      |
          v                      v
   Speech Recognition      Text Input
          |                      |
          +----------+-----------+
                     |
                     v
              Express Backend
                     |
          +----------+-----------+
          |                      |
          v                      v
      Groq API            Mock Order Data
          |                      |
          +----------+-----------+
                     |
                     v
              AI Response
                     |
                     v
             React Frontend
                     |
          +----------+-----------+
          |                      |
          v                      v
     Spoken Response       Transcript
                                  |
                                  v
                         Post-Call Summary
```

### How It Works

1. The customer starts a call through the browser interface.
2. The browser captures the customer's voice using the Speech Recognition API.
3. The recognized speech is converted into text and sent to the Express backend.
4. The backend processes the request and retrieves mock order information when required.
5. Groq generates a response using conversation context, order information, and Aura Skincare's business policies.
6. The frontend displays the response and speaks it using browser speech synthesis.
7. The conversation continues until the customer ends the call.
8. The backend generates a structured post-call summary from the transcript.

## Mock Order Database

The application uses predefined mock orders to demonstrate order tracking and cancellation eligibility.

| Order ID | Customer | Product | Amount | Status |
|---|---|---|---|---|
| ORD-101 | Priya Sharma | Vitamin C Serum | ₹699 | Out for Delivery |
| ORD-102 | Rahul Verma | Hydrating Sunscreen SPF 50 | ₹499 | Delivered |
| ORD-103 | Ananya Patel | Green Tea Face Wash + Toner | ₹850 | Processing |

### Order Details

**ORD-101**
- Courier: BlueDart
- Tracking Number: BD-982103
- Expected Delivery: By 6 PM today
- Cancellation: Not eligible because the order is Out for Delivery

**ORD-102**
- Courier: Delhivery
- Tracking Number: DL-441029
- Delivery Status: Delivered 14 days ago
- Return Window: Outside the standard seven-day return period

**ORD-103**
- Status: Processing
- Ordered: Three hours ago
- Cancellation: Eligible under the current cancellation policy

These orders are mock records used for demonstration. The application does not connect to a real order management system.

## Aura Skincare Business Policies

### Shipping
- Free shipping on orders above ₹499.
- A ₹50 shipping fee applies to orders below ₹499.
- Standard delivery takes 3–5 business days.

### Returns
- Returns are accepted within seven days of delivery.
- Products must be unopened, unused, and in their original packaging.

### Damaged or Defective Products
- Customers must report damaged or defective products within 48 hours of delivery.
- Photographic evidence is required.

### Order Cancellation
- Orders in Processing status may be eligible for cancellation.
- Shipped and Out for Delivery orders cannot be cancelled.

### Cash on Delivery
- COD is available for orders up to ₹2,500.
- Customers can pay using cash or UPI at delivery.

### Support Safety
The assistant must not claim that an order has been cancelled, refunded, returned, or replaced unless the system confirms that the action has actually been completed.

## Getting Started

### Prerequisites

- Node.js and npm
- A Groq API key
- A modern browser with microphone permissions
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/AnuSaha545/aura-skincare-ai-voice-agent.git
cd aura-skincare-ai-voice-agent
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory.

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

Replace the placeholder with your Groq API key.

Never commit `.env` files or API credentials to GitHub.

### 3. Start the Backend

```bash
npm start
```

The backend runs locally at:

`http://localhost:5000`

### 4. Configure the Frontend

Open a new terminal from the project root:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
```

### 5. Start the Frontend

```bash
npm run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173`

Allow microphone access when prompted.

## Deployment

### Frontend — Vercel

The React application is deployed using Vercel.

Deployment configuration:

- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variable:

```env
VITE_API_URL=https://aura-skincare-ai-backend.onrender.com
```

### Backend — Render

The Express backend is deployed using Render.

Environment variables:

```env
GROQ_API_KEY=your_groq_api_key_here
CORS_ORIGIN=https://aura-skincare-ai-voice-agent-steel.vercel.app
```

The backend uses the port supplied by Render through the `PORT` environment variable.

**Live Website:** https://aura-skincare-ai-voice-agent-steel.vercel.app/

## Example Conversations

### Order Tracking

**Customer:** "Hi Aria, where is my order ORD-101?"

**Aria:** "Your order ORD-101 containing Vitamin C Serum is currently out for delivery with BlueDart. It is expected to arrive by 6 PM today."

### Cancellation Request

**Customer:** "Can I cancel order ORD-103?"

**Aria:** "Your order ORD-103 is currently being processed, so it is eligible for cancellation. However, I cannot confirm a cancellation unless the system completes that action."

### Return Policy

**Customer:** "Can I return a product after ten days?"

**Aria:** "Aura Skincare accepts returns within seven days of delivery, provided the product is unopened, unused, and in its original packaging. A return requested after ten days falls outside the standard return window."

These are illustrative conversations demonstrating the intended behavior of the assistant.

## Post-Call Summary

After a customer ends a call, the application generates a structured summary containing:

- `customer_intent`: The primary reason for contacting support.
- `order_id`: The referenced order ID, when available.
- `resolution_status`: The outcome or status of the request.
- `call_summary`: A concise summary of the conversation.

Example:

```json
{
  "customer_intent": "Order tracking",
  "order_id": "ORD-101",
  "resolution_status": "Resolved",
  "call_summary": "The customer requested an update on order ORD-101. The assistant provided the current delivery status, courier details, and expected delivery time."
}
```

## Architecture and Design Reflection

### 1. Why was this technology stack selected?

React and Vite were selected to provide a responsive browser-based user interface with a straightforward development workflow.

Node.js and Express were chosen for backend API handling and integration with the Groq API.

Groq provides LLM-based conversational responses, while the browser's built-in speech recognition and synthesis APIs enable voice interaction without requiring a separate paid speech infrastructure.

The architecture separates frontend interaction from backend processing, making the application easier to maintain and extend.

### 2. How does the agent retrieve order information and apply business policies?

The backend uses mock order records and an order lookup mechanism to retrieve information associated with customer-provided order IDs.

Relevant order details are incorporated into the AI response context alongside Aura Skincare's predefined business policies.

This enables Aria to explain order status, expected delivery information, return eligibility, and cancellation restrictions.

The assistant is instructed not to invent order details or claim that unsupported operations have been completed.

### 3. How are conversation context, errors, and unreliable AI responses handled?

Recent conversation history is supplied to the AI model to support multi-turn interactions.

The backend provides order information and business rules as context to reduce unsupported responses.

Invalid order IDs and API failures are handled through application-level error handling.

For actions such as cancellations, refunds, and replacements, the assistant distinguishes between explaining eligibility and confirming execution.

This reduces the risk of misleading customers about actions that have not actually occurred.

### 4. What would be improved for a production-ready system?

A production implementation would replace mock order records with a secure integration to an actual order management platform.

Additional improvements would include:

- Customer authentication and order ownership verification.
- Secure cancellation, return, and refund workflows.
- Automated testing and observability.
- Improved speech latency and interruption handling.
- More reliable tool-based policy enforcement.
- Rate limiting and stronger API security.
- Conversation privacy controls and appropriate data retention policies.
- Scalable infrastructure for concurrent customer conversations.

## Current Limitations

- Voice recognition and synthesis depend on browser compatibility and microphone permissions.
- The application uses mock order data.
- Real cancellations, refunds, and replacements are not executed.
- Speech recognition accuracy may vary depending on accent, background noise, and browser support.
- The project is a deployed demonstration rather than a production-integrated customer support platform.

## Future Improvements

- Integrate a real order management system.
- Implement authenticated customer support workflows.
- Add automated API and frontend tests.
- Improve voice interruption handling and response latency.
- Support additional languages and natural code-switching.
- Add monitoring, rate limiting, and structured logging.
- Improve reliability through dedicated backend tools and stricter validation.

## Security

- API keys are stored in backend environment variables.
- Sensitive credentials should never be exposed through frontend environment variables.
- `.env` files must not be committed to GitHub.
- `.env.example` should contain placeholders rather than real secrets.
- Backend CORS configuration restricts browser access to approved frontend origins.
- Production deployments should include additional authentication, validation, and abuse prevention.

## Project Status

**Deployed and functional as a demonstration application.**

- Frontend hosted on Vercel.
- Backend hosted on Render.
- Groq integrated for AI-powered conversations.
- Browser-based voice interaction available.
- Mock order tracking and policy assistance implemented.
- Conversation transcripts and post-call summaries available.
  
---

GitHub: https://github.com/AnuSaha545

---

Built as an AI Voice Customer Experience Agent assignment for DataStraw.
