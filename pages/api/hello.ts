// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from "next";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
const loadenv = require("loadenv");

// Load environment variables from .env file
loadenv();

// Now you can access your environment variables
const openaiAPIKey = process.env.OPENAI_API_KEY;
const tavilyAPIKey = process.env.TAVILY_API_KEY;

type Chunk = {
  intermediateSteps?: {
    action: {
      tool: string;
      toolInput: { [key: string]: any };
      log: string;
      messageLog: any[];
    };
    observation: string;
  }[];
  output?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set response headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Define the tools the agent will have access to.
  const tools = [new TavilySearchResults({
    apiKey: tavilyAPIKey,
  })]

  const llm = new ChatOpenAI({
    model: "gpt-3.5-turbo-1106",
    temperature: 0,
    apiKey: openaiAPIKey,
  });

  // Get the prompt to use - you can modify this!
  const prompt = await pull<ChatPromptTemplate>(
    "hwchase17/openai-functions-agent"
  );

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const stream = await agentExecutor.stream({
    input: "what is the weather in SF and then LA",
  });

  // Stream each chunk to the client
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    // Send intermediate steps log to the client
    if (chunk.intermediateSteps && chunk.intermediateSteps[0].log) {
      res.write(`data: ${chunk.intermediateSteps[0].log}\n\n`);
    }
    // If it's the final output, send it to the client and close the response
    if (chunk.output) {
      res.write(`data: ${JSON.stringify({ output: chunk.output })}\n\n`);
      res.end();
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

