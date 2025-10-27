import {
  supportedGames,
  supportedGamesHashMap,
} from "../meta/supportedGames.js"
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import express from "express"
import { z } from "zod"
import { EventDataSchema, ParserOptionsSchema } from "./types.js"
import { fetchMatches } from "./fetch.js"

const availableGameIdsString = `Available game IDs: ${supportedGames
  .map((game) => game.id)
  .join(", ")}`

// Create an MCP server
const server = new McpServer({
  name: "esports-calendar-server",
  version: "1.0.0",
})

server.registerTool(
  "get_esports_events_advanced_request",
  {
    title: "Make an advanced search to the esports events calendar",
    description: `Get esports events filtered by game ID.\n${availableGameIdsString}`,
    inputSchema: {
      games: z.array(
        z.object({
          id: z.string(),
          opts: ParserOptionsSchema.omit({ url: true, shouldVerbose: true }),
        })
      ),
    },
    outputSchema: { events: z.array(EventDataSchema) },
  },
  async ({ games }) => {
    const events = await Promise.all(
      games.map((game) =>
        fetchMatches(supportedGamesHashMap[game.id].url, game.opts)
      )
    )
    const allEvents = events.flat()
    return {
      content: [{ type: "text", text: JSON.stringify(allEvents) }],
      structuredContent: { events: allEvents },
    }
  }
)

// Add a dynamic greeting resource
server.registerResource(
  "esports_events_by_game",
  new ResourceTemplate("esports_events_by_game://{gameId}", {
    list: undefined,
  }),
  {
    title: "Esports Events (filtered by game ID)", // Display name for UI
    description: `Get esports events filtered by game ID.\nAvailable game IDs: ${Object.keys(
      supportedGames
    ).join(", ")}.\n\nExample: esports_events_by_game://rocketleague`,
  },
  async (uri, { gameId }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${gameId}!`,
      },
    ],
  })
)

// Set up Express and HTTP transport
const app = express()
app.use(express.json())

app.post("/", async (req, res) => {
  console.log("req.body", req.body)

  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  res.on("close", () => {
    transport.close()
  })

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

export default app
