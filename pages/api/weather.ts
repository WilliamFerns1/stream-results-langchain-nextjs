import { NextApiRequest, NextApiResponse } from "next";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
const loadenv = require("loadenv");

// Load environment variables from .env file
loadenv();

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
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const tools = [new TavilySearchResults({
    apiKey: tavilyAPIKey,
  })]

  const llm = new ChatOpenAI({
    model: "gpt-3.5-turbo-1106",
    temperature: 0,
    apiKey: openaiAPIKey,
  });

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
    try {
      if (chunk.hasOwnProperty('intermediateSteps')) {
        const log = chunk.intermediateSteps[0]["action"].log;
        const responseMessage = `data: ${JSON.stringify({ log: log })}\n\n`;
        console.log(`Log: ${log}`);
        console.log(responseMessage);
        res.write(responseMessage);
        res.flush(); // Force send data to client immediately
      } else if (chunk.hasOwnProperty('output')) {
        const output = chunk.output;
        const responseMessage = `data: ${JSON.stringify({ output: output })}\n\n`;
        console.log(`Output: ${output}`);
        console.log(responseMessage);
        res.write(responseMessage);
        res.flushHeaders(); // Force send data to client immediately
      }
    } catch (e) {
      console.log(`Error: ${e}`);
    }
  }

  // Close the response after sending all data
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};

