/**
 * Download the test data for all supported games and save it to the testData directory
 *
 * Not used at the moment, it's a project for avoiding the automated tests to rely on the network
 */
import path from "path"
import { supportedGames } from "../meta/supportedGames.js"
import fs from "fs"
import axios from "axios"

const __dirname = new URL(".", import.meta.url).pathname
const testDataPath = path.resolve(__dirname, "..", "testData")
fs.rmSync(testDataPath, { recursive: true })
fs.mkdirSync(testDataPath, { recursive: true })

for (const game of supportedGames) {
  fs.mkdirSync(path.resolve(testDataPath, game.name), { recursive: true })
  console.log("Downloading test data for", game.name)
  const response = await axios.get(game.url)
  fs.writeFileSync(
    path.resolve(testDataPath, game.name, "testData.html"),
    response.data
  )
}
console.log("Test data downloaded and saved to", testDataPath)
