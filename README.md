# Aura Skincare AI Voice Customer Support Agent

An AI-powered voice customer support agent that helps Aura Skincare customers with order tracking, delivery questions, product inquiries, and brand policies through a browser-based conversational interface.

Aria, the virtual support assistant, combines AI-generated responses with order lookup, voice interaction, conversation transcripts, and structured post-call summaries.

## Features

- **Voice interaction:** Speak to Aria through the browser microphone and hear spoken responses.
- **AI-powered support:** Generate concise, conversational responses using Groq.
- **Order lookup:** Retrieve mock order details using an order ID.
- **Policy-aware responses:** Apply shipping, cancellation, return, refund, and damaged-product policies.
- **Conversation context:** Use recent conversation history to support multi-turn interactions.
- **Call transcript:** Review the conversation between the customer and Aria.
- **Post-call summary:** Generate structured summaries containing customer intent, order ID, resolution status, and call summary.
- **Error handling:** Handle AI request failures and invalid order references without silently claiming that an action was completed.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express |
| AI provider | Groq API |
| AI model | `openai/gpt-oss-20b` |
| Voice input | Browser Speech Recognition API |
| Voice output | Browser Speech Synthesis API |
| API communication | HTTP/REST |

## Architecture

1. The React frontend captures customer input through voice or text.
2. The Express backend receives requests through the AI API routes.
3. The backend uses Groq to generate responses according to Aura Skincare's support policies.
4. When an order reference is available, the backend retrieves the relevant mock order details.
5. Responses return to the frontend, where Aria displays and speaks them.
6. When a call ends, the backend generates a structured summary from the transcript.

## Getting Started

### Prerequisites

- Node.js and npm
- A Groq API key
- A modern browser with microphone access for voice interaction

### 1. Clone the repository

```bash
git clone https://github.com/AnuSaha545/aura-skincare-ai-voice-agent.git
cd aura-skincare-ai-voice-agent
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory using `.env.example` as a reference.

Set your API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Never commit your real API key or `.env` file.

### 3. Start the backend

From the `backend` directory, run:

```bash
npm start
```

The backend should be available at `http://localhost:5000` when using the default port configuration.

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal. Allow microphone access when prompted to test voice interaction.

If your local package scripts differ, use the scripts defined in the corresponding `package.json`.

## Example Capabilities

### Order tracking

A customer can ask Aria about an order using an order ID. The backend looks up the order and uses the returned information to formulate a response.

### Policy questions

Aria can explain the applicable shipping, delivery, cancellation, return, and damaged-product policies.

### Post-call summary

After a call ends, the application generates a structured summary with:

- `customer_intent`
- `order_id`
- `resolution_status`
- `call_summary`

## Business Rules

- Free shipping applies to orders above ₹499; orders below ₹499 incur a ₹50 shipping fee.
- Standard delivery takes 3–5 business days.
- Returns are accepted within seven days of delivery for unopened, unused products in their original packaging.
- Damaged or defective products must be reported within 48 hours with photos.
- Orders in Processing status may be eligible for cancellation.
- Shipped and Out for Delivery orders cannot be cancelled through the current support flow.
- COD is available up to ₹2,500.

The agent must not claim that a cancellation, refund, return, or replacement has been completed unless the system confirms it.

## Configuration and Security

- Keep API credentials in environment variables.
- Use `.env.example` to document required configuration without exposing secrets.
- Do not commit real API keys or other credentials.
- The current project uses mock order data; it is not connected to a live e-commerce order management system.

## Current Limitations

- Browser voice recognition and speech synthesis depend on browser support and permissions.
- Order information is based on mock data.
- The current implementation does not perform real order cancellations, refunds, or replacements.
- The application has not yet been presented here as a deployed production service.
- Production use would require stronger validation, monitoring, privacy controls, rate limiting, and integration with live order systems.

## Future Improvements

- Deploy the frontend and backend.
- Integrate a real order management system.
- Add automated tests for order lookup, AI responses, and call summaries.
- Improve voice interruption handling and response latency.
- Add monitoring, rate limiting, and production-grade error handling.
