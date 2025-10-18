import { convertIcsCalendar, type IcsCalendar } from "ts-ics"

export type NonStandard = {
  competition: string
  competitionUrl: string
  teamLeft: string
  teamLeftFullName: string
  teamLeftUrl: string
  teamLeftLogo: string
  teamRight: string
  teamRightFullName: string
  teamRightUrl: string
  teamRightLogo: string
  winnerSide: string
  descriptor: string
  descriptorMoreInfo: string
}

export const parseCalendar = (icsText: string): IcsCalendar<NonStandard> => {
  const calendar = convertIcsCalendar<NonStandard>(undefined, icsText, {
    nonStandard: {
      competition: {
        name: "X-LIQUIPEDIATOICAL-COMPETITION",
        convert: ({ value }) => value,
      },
      competitionUrl: {
        name: "X-LIQUIPEDIATOICAL-COMPETITIONURL",
        convert: ({ value }) => value,
      },
      teamLeft: {
        name: "X-LIQUIPEDIATOICAL-TEAMLEFT",
        convert: ({ value }) => value,
      },
      teamLeftFullName: {
        name: "X-LIQUIPEDIATOICAL-TEAMLEFTFULLNAME",
        convert: ({ value }) => value,
      },
      teamLeftUrl: {
        name: "X-LIQUIPEDIATOICAL-TEAMLEFTURL",
        convert: ({ value }) => value,
      },
      teamLeftLogo: {
        name: "X-LIQUIPEDIATOICAL-TEAMLEFTLOGO",
        convert: ({ value }) => value,
      },
      teamRight: {
        name: "X-LIQUIPEDIATOICAL-TEAMRIGHT",
        convert: ({ value }) => value,
      },
      teamRightFullName: {
        name: "X-LIQUIPEDIATOICAL-TEAMRIGHTFULLNAME",
        convert: ({ value }) => value,
      },
      teamRightUrl: {
        name: "X-LIQUIPEDIATOICAL-TEAMRIGHTURL",
        convert: ({ value }) => value,
      },
      teamRightLogo: {
        name: "X-LIQUIPEDIATOICAL-TEAMRIGHTLOGO",
        convert: ({ value }) => value,
      },
      winnerSide: {
        name: "X-LIQUIPEDIATOICAL-WINNERSIDE",
        convert: ({ value }) => value,
      },
      descriptor: {
        name: "X-LIQUIPEDIATOICAL-DESCRIPTOR",
        convert: ({ value }) => value,
      },
      descriptorMoreInfo: {
        name: "X-LIQUIPEDIATOICAL-DESCRIPTORMOREINFO",
        convert: ({ value }) => value,
      },
    },
  })

  return calendar
}
