import { useMemo, useState } from "react"
import { useConfig } from "@/hooks/useConfig.js"
import { useIcs } from "@/queries.js"
import { type IcsEvent, type NonStandardValuesGeneric } from "ts-ics"
import { parseCalendar, type NonStandard } from "@/utils.ics.js"
import { wrapUrl, relativeDate, capitalize } from "@/utils.js"
import clsx from "clsx"
import { GameConfigurator } from "./component.gameConfigurator.js"

export const CalendarView = () => {
  return (
    <div className="flex flex-col flex-2 gap-4">
      <ConfigSection />
      <ImportSection />
      <CalendarViewContent />
    </div>
  )
}

function ConfigSection() {
  const { config } = useConfig()
  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-bold">Calendar configuration</div>
      <div className="text-base text-gray-500">
        Decide which events you want to see.
      </div>
      {Object.entries(config.selectedGames).map(([gameId, gameConfig]) => (
        <GameConfigurator key={gameId} gameId={gameId} />
      ))}
    </div>
  )
}

function ImportSection() {
  const { icsUrl } = useConfig()

  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-bold flex-2">Import this Calendar</div>
      <div className="text-sm text-gray-500 break-all flex flex-row gap-2">
        Method 1: URL: <IcalUrl url={icsUrl} />
      </div>
      <div className="text-sm text-gray-500">
        Method 2: Button:
        <a
          href={icsUrl.replace("https", "webcal")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="bg-red-600 text-white px-2 border-1 border-red-500 rounded-md outline-none opacity-90 hover:opacity-100 transition-opacity duration-300 cursor-pointer ml-1">
            Add to Calendar
          </button>
        </a>
      </div>
    </div>
  )
}

function IcalUrl({ url }: { url: string }) {
  const [isCopied, setIsCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 1000)
  }
  return (
    <div className="text-sm text-gray-500 break-all">
      <input
        type="text"
        className="w-64 overflow-hidden bg-neutral-500 text-white px-2 border-1 border-neutral-300 rounded-md outline-none"
        value={url}
      />
      <button
        className="bg-neutral-500 text-white px-2 border-1 border-neutral-500 rounded-md outline-none opacity-90 hover:opacity-100 transition-opacity duration-300 cursor-pointer ml-1"
        onClick={handleCopy}
      >
        {isCopied ? "✅ Copied" : "Copy"}
      </button>
    </div>
  )
}

export function CalendarViewContent() {
  const icsRequest = useIcs()

  const isValidIcs = useMemo(() => {
    if (!icsRequest.data) return false
    if (icsRequest.isError) return false
    if (!icsRequest.data) return false
    if (!icsRequest.data.includes("BEGIN:VCALENDAR")) return false
    return true
  }, [icsRequest.data])

  const ics = useMemo(() => {
    if (!isValidIcs) return null
    return parseCalendar(icsRequest.data)
  }, [icsRequest.data])

  const perDayEvents: Record<string, IcsEvent<NonStandard>[]> = useMemo(() => {
    if (!ics) return null
    const perDayEventsRaw =
      ics?.events?.reduce(
        (acc, event) => {
          const date = new Date(
            event.start.date.toString(),
          ).toLocaleDateString()
          if (!acc[date]) {
            acc[date] = []
          }
          acc[date].push(event)
          return acc
        },
        {} as Record<string, IcsEvent<NonStandard>[]>,
      ) ?? ({} as Record<string, IcsEvent<NonStandard>[]>)

    return Object.fromEntries(
      Object.entries(perDayEventsRaw).sort((a, b) => {
        return new Date(a[0])
          .toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .localeCompare(
            new Date(b[0]).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
          )
      }),
    )
  }, [ics])

  if (icsRequest.isLoading) {
    return <div>Loading...</div>
  }

  if (icsRequest.isError) {
    return <div>Error: {icsRequest.error?.message}</div>
  }

  if (!isValidIcs) {
    return <div>Invalid ICS</div>
  }

  console.log(ics)

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(perDayEvents).map(([date, events]) => (
        <div key={date}>
          <div className="text-2xl font-bold mb-2">
            {capitalize(relativeDate(new Date(date)))}
          </div>
          {events.map((event) => (
            <div
              key={event.uid}
              className="border-b border-neutral-300 pb-2 flex flex-col gap-2 w-full"
            >
              <div className="flex flex-row justify-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-xl">
                    {event.start.date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </div>
                  <div className="flex flex-row gap-4 justify-start items-center">
                    <Side
                      side="left"
                      teamName={event.nonStandard.teamLeft}
                      teamFullName={event.nonStandard.teamLeftFullName}
                      url={event.nonStandard.teamLeftUrl}
                      logo={event.nonStandard.teamLeftLogo}
                    />
                    <div className="text-xl w-32 text-center">
                      {event.nonStandard.descriptor || "vs"}
                    </div>
                    <Side
                      side="right"
                      teamName={event.nonStandard.teamRight}
                      teamFullName={event.nonStandard.teamRightFullName}
                      url={event.nonStandard.teamRightUrl}
                      logo={event.nonStandard.teamRightLogo}
                    />
                  </div>
                  <div className="flex flex-row justify-center opacity-50 hover:opacity-100 transition-opacity duration-300">
                    <div>
                      <a
                        href={event.nonStandard.competitionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {event.nonStandard.competition}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export const Side = ({
  side,
  teamName,
  teamFullName,
  url,
  logo,
}: {
  side: "left" | "right"
  teamName: string
  teamFullName: string
  url: string
  logo: string
}) => {
  const alignedParts = useMemo(() => {
    const alignedPartsRaw = [
      <TeamLogo logo={logo} url={url} />,
      <div
        className={clsx(
          "flex flex-col w-64",
          side === "left" ? "items-end" : "items-start",
          side === "left" ? "text-right" : "text-left",
        )}
      >
        <div className="text-xl font-bold">{teamName}</div>
        <div>{teamFullName}</div>
      </div>,
    ]
    if (side === "left") {
      return alignedPartsRaw.reverse()
    }
    return alignedPartsRaw
  }, [side, teamName, url, logo])

  return (
    <a className="flex-1" href={url} target="_blank" rel="noopener noreferrer">
      <div
        className={clsx(
          "flex flex-row gap-2 items-center",
          side === "left" ? "justify-end" : "justify-start",
        )}
      >
        {alignedParts.map((part) => part)}
      </div>
    </a>
  )
}

export function TeamName({
  name,
  fullName,
  url,
}: {
  name?: string
  fullName?: string
  url: string
}) {
  const nameToUse = useMemo(() => {
    if (fullName) {
      return fullName
    }
    return name
  }, [name, fullName])
  return (
    <div className="text-xl font-bold hover:brightness-150 transition-brightness duration-300">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {nameToUse}
      </a>
    </div>
  )
}
export function TeamLogo({ logo, url }: { logo: string; url: string }) {
  const logoToUse = useMemo(() => {
    if (url) {
      return wrapUrl(logo)
    }
    return wrapUrl(
      "https://liquipedia.net/commons/images/d/d5/Flag_Unknown.svg",
    )
  }, [logo, url])

  const logoWithLinkIfUrl = useMemo(() => {
    let img = <img className="h-10" src={wrapUrl(logoToUse)} alt={logo} />
    if (url) {
      img = (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      )
    }
    return img
  }, [logo, url])

  return <div>{logoWithLinkIfUrl}</div>
}
