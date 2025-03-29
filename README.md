# Sciensaurus: AI-Powered Scientific Research Companion

Sciensaurus makes complex scientific research accessible with clear summaries, key insights, and related research. This project uses Next.js, Tailwind CSS, and the Vercel AI SDK to provide AI-powered analysis of scientific articles.

## Features

- **AI-Powered Article Analysis**: Analyze scientific articles by simply providing a URL
- **Clear Summaries**: Get concise bullet points highlighting key findings
- **Methodology Breakdown**: Understand how the research was conducted
- **Significance Analysis**: Learn why the research matters in the broader scientific context
- **Limitations**: Identify caveats and limitations mentioned in the research

## Tech Stack

- **Next.js**: React framework for the frontend and API routes
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vercel AI SDK**: For integrating with AI providers (OpenAI)
- **OpenAI**: GPT-4 model for scientific article analysis

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sciensaurus.git
   cd sciensaurus
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your OpenAI API key.

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI SDK Setup

This project uses the Vercel AI SDK to integrate with AI providers. Here's how it's set up:

1. **API Routes**: Check out `app/api/analyze-article/route.ts` to see how the API endpoint is configured.

2. **AI SDK Components**: See `components/article-analyzer.tsx` for the client-side implementation.

3. **User Flow**:
   - User inputs a scientific article URL
   - The input is sent to the API route
   - The API route uses OpenAI to analyze the article
   - The analysis is streamed back to the client
   - The client displays the analysis in real-time

## Customizing

- **System Prompt**: You can customize the AI system prompt in `app/api/analyze-article/route.ts`.
- **UI Components**: The UI components are in the `components` directory.
- **Styling**: This project uses Tailwind CSS for styling.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
