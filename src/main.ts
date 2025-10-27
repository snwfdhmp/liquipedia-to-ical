#!/usr/bin/env tsx
import { test, type TestOptions } from "./test.js"

import httpApi from "./http.js"
import mcpApi from "./mcp.js"
/**
 * Program entry point, determines what behavior we want to run
 */
if (process.argv[2] === "test") {
  // run the tests

  // parse the arguments
  const testOpts: TestOptions = {
    limitTestsTo: [],
    opts: {
      verbose: false,
      onlyOutputErrors: false,
    },
  }
  const availablesArgs = process.argv.slice(3)
  for (let i = 0; i < availablesArgs.length; i++) {
    const arg = availablesArgs[i]

    switch (arg) {
      case "-v":
        testOpts.opts.verbose = true
        break
      case "-o":
        testOpts.opts.onlyOutputErrors = true
        break
      default:
        testOpts.limitTestsTo.push(arg)
        break
    }
  }

  // finally run the tests
  const validated = await test(testOpts)
  process.exit(validated ? 0 : 1)
} else {
  // run the server
  const HTTP_PORT = process.env.HTTP_PORT || 9059
  httpApi.listen(HTTP_PORT, () => {
    console.log(`HTTP API started on 0.0.0.0:${HTTP_PORT}`)
  })

  const MCP_PORT = process.env.MCP_PORT || 7488
  mcpApi.listen(MCP_PORT, () => {
    console.log(`MCP API started on 0.0.0.0:${MCP_PORT}`)
  })
}
