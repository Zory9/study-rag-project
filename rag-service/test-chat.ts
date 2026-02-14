import { runChat } from "./src/answer-generation.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

async function startLocalChat() {
  // testing the chat function with a command-line interface  
  const chatHistory: string[] = [];

  while (true) {
    const query = await rl.question("\nYou: ");

    if (query.toLowerCase() === "exit") {
      console.log("Closing chat...");
      break;
    }

    try {
      console.log("Thinking...");
      const result = await runChat(query, chatHistory);

      console.log(`\nAI answer: ${result.answer}`);
      
      if (result.sources.length > 0) {
        console.log("\nSources used:");
        result.sources.forEach((s, i) => {
          console.log(`   [${i + 1}] ${s.fileName} (Pg: ${s.page}, Lines: ${s.lineFrom}-${s.lineTo})`);
        });
      }

      // Update history for the next turn
      chatHistory.push(`User: ${query}`);
      chatHistory.push(`Assistant: ${result.answer}`);

    } catch (error) {
      console.error("Error during chat:", error);
    }
  }
  rl.close();
}

startLocalChat();