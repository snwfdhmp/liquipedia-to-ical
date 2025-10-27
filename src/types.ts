import { z } from "zod"

export const ParserOptionsSchema = z.object({
  url: z.string().optional(),
  competitionRegex: z.string().optional(),
  teamsRegex: z.string().optional(),
  teamsRegexUseFullnames: z.boolean().optional(),
  conditionIsOr: z.boolean().optional(),
  matchBothTeams: z.boolean().optional(),
  ignoreTbd: z.boolean().optional(),
  shouldVerbose: z.boolean().optional(),
  pastMatchAllowSeconds: z.number().optional(),

  expectMissingTeams: z.boolean().optional(),
  allowMissingTeams: z.boolean().optional(),
})

export type ParserOptions = z.infer<typeof ParserOptionsSchema>

export const EventDataSchema = z.object({
  uid: z.string(),
  dateTimestamp: z.number(),
  competition: z.string(),
  summary: z.string(),

  // optional
  team1: z.string().nullable().optional(),
  team2: z.string().nullable().optional(),
  team1fullName: z.string().nullable().optional(),
  team2fullName: z.string().nullable().optional(),
  team1Url: z.string().nullable().optional(),
  team2Url: z.string().nullable().optional(),
  team1Logo: z.string().nullable().optional(),
  team2Logo: z.string().nullable().optional(),
  competitionUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptor: z.string().nullable().optional(),
  descriptorMoreInfo: z.string().nullable().optional(),
  winnerSide: z.string().nullable().optional(),
  isMissingTeams: z.boolean().nullable().optional(),
})

export type EventData = z.infer<typeof EventDataSchema>

export interface SupportedGame {
  id: string
  name: string
  url: string
  baseUrl: string
  enforcedOpts: ParserOptions
}
