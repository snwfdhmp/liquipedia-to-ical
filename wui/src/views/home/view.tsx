import { useState, useMemo, useEffect } from "react"
import { supportedGames } from "../../../../meta/supportedGames.js"
import { useConfig } from "@/hooks/useConfig.js"
import { createIcsUrlFromConfig } from "@/utils.js"
import { useIcs } from "@/queries.js"
import { CalendarView } from "./component.calendarView.js"
import { LeftSidebar } from "./component.leftSideBar.js"
import { RightSidebar } from "./component.rightSideBar.js"

export const HomeView = () => {
  return (
    <div className="flex flex-row items-start justify-between px-8 pt-8">
      <LeftSidebar />
      <CalendarView />
      <RightSidebar />
    </div>
  )
}
