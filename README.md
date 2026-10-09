# Aura Skincare AI Voice Agent

A browser-based AI voice customer support agent for Aura Skincare that handles customer queries, retrieves order details, explains store policies, and generates a structured summary after each call.

## Features

- **Voice interaction:** Speak with the AI support agent through your browser.
- **AI-powered responses:** Uses Ollama with a local language model to generate responses.
- **Order lookup:** Retrieves order details through the `get_order_details(order_id)` tool.
- **Policy-based support:** Answers questions about shipping, delivery, returns, damaged products, cancellations, and Cash on Delivery (COD).
- **Speech output:** Converts AI responses into spoken audio.
- **Call transcript:** Displays the conversation between the customer and the AI agent.
- **Call summary:** Generates structured information about customer intent, order ID, resolution status, and call summary.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express.js |
| AI Model | Ollama with Llama 3.2 |
| Speech Recognition | Web Speech API |
| Text-to-Speech | Browser Speech Synthesis API |
| API Communication | REST API |
| Order Data | JavaScript-based mock order data |

## Architecture

The application uses a React frontend to capture customer speech and display the conversation. The Express backend processes requests, retrieves order details, and communicates with the locally hosted Ollama model.

```text
Customer
   |
   v
React + Vite Frontend
   |
   | Speech Recognition
   v
Express Backend
   |
   +---- Order Lookup Tool
   |          |
   |          v
   |      Mock Order Data
   |
   +---- Ollama LLM
   |
   v
AI Response
   |
   v
Browser Text-to-Speech
   |
   v
Customer
```

## AI Support Agent

The AI support agent, Aria, is designed to communicate in a friendly, professional, and concise manner.

Aria can:
- Answer skincare store policy questions.
- Retrieve available order information.
- Explain delivery status and tracking details.
- Check cancellation eligibility based on order status.
- Explain return and damaged-product procedures.
- Generate a summary of the completed conversation.

The agent should use the available order data and store policies rather than inventing information.

## Store Policies

| Policy | Details |
|---|---|
| Free shipping | Orders above ₹499 |
| Shipping fee | ₹50 for orders below ₹499 |
| Delivery time | 3–5 business days |
| Returns | Within 7 days for unopened and unused products in original packaging |
| Damaged or defective products | Report within 48 hours and provide photos |
| Cancellation | Allowed while an order is Processing |
| Shipped orders | Cannot be cancelled; customers may refuse delivery at the doorstep |
| Cash on Delivery | Available up to ₹2,500; payment by cash or UPI |

## Sample Orders

The application includes sample orders for testing the order lookup functionality.

| Order ID | Customer | Order Status |
|---|---|---|
| ORD-101 | Priya Sharma | Out for Delivery |
| ORD-102 | Rahul Verma | Delivered |
| ORD-103 | Ananya Patel | Processing |

These are mock records used for demonstration purposes, not live customer orders.

## Project Structure

```text
aura-skincare-ai-agent/
├── backend/
│   ├── api/
│   │   ├── aiRoutes.js
│   │   └── orderRoutes.js
│   ├── data/
│   │   └── orderData.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── orderService.js
│   ├── tools/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js and npm
- Ollama
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd aura-skincare-ai-agent
```

Replace the placeholder with your public GitHub repository URL.

### 2. Set up Ollama

Install Ollama from [https://ollama.com](https://ollama.com).

Download the model used by the application:

```bash
ollama pull llama3.2
```

Ensure Ollama is running before starting the backend.

### 3. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as a reference. Configure the Ollama URL, model name, or other variables required by your implementation.

Start the backend using the script configured in `backend/package.json`. For example, if the project defines a `start` script:

```bash
npm start
```

The backend is configured to run on:

`http://localhost:5000`

### 4. Set up the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

Allow microphone access when prompted by the browser.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Check backend status |
| GET | `/api/orders/:orderId` | Retrieve an order by ID |
| POST | `/api/ai/chat` | Process a customer message and conversation history |
| POST | `/api/ai/summary` | Generate a structured call summary |

The AI endpoints expect the request body defined by the backend implementation.

## Call Summary

After a conversation, the application generates a structured summary containing:

```json
{
  "customer_intent": "Order tracking",
  "order_id": "ORD-101",
  "resolution_status": "Resolved",
  "call_summary": "The customer asked about delivery status and received the available tracking information."
}
```

The example above illustrates the expected format; actual values should reflect the conversation.

## Testing Scenarios

1. **Order tracking:** Ask Aria for the status of ORD-101.
2. **Cancellation:** Ask whether ORD-103 can be cancelled while it is Processing.
3. **Return policy:** Ask about the return eligibility requirements.
4. **Unknown order:** Provide an invalid order ID and verify that the agent handles it gracefully.
5. **Call summary:** End the conversation and inspect the transcript and structured summary.

## Limitations

- Sample orders are stored locally and do not represent a live order management system.
- Order updates are not connected to a real courier service.
- Local AI inference requires Ollama to be running.
- Browser speech recognition availability depends on browser support and microphone permissions.
- Public deployment requires an accessible AI inference service and correctly configured frontend and backend URLs.

## Future Improvements

- Integrate a real order management system and courier tracking APIs.
- Add customer authentication and secure order access.
- Improve multilingual speech support.
- Add persistent conversation history and analytics.
- Deploy the application with a remotely accessible AI inference endpoint.
