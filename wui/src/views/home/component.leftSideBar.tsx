import { useMemo, useState } from "react"
import { useConfig } from "@/hooks/useConfig.js"
import {
  supportedGames,
  supportedGamesHashMap,
} from "../../../../meta/supportedGames.js"
import clsx from "clsx"

export const LeftSidebar = () => {
  const { config, setConfig } = useConfig()

  const supportedGamesChoices = useMemo(() => {
    return supportedGames.map((game) => ({
      label: game.name,
      value: game.id,
    }))
  }, [supportedGames])

  return (
    <div className="flex-1">
      <div className="text-2xl font-bold flex-1">Games</div>
      <MultiSelector
        choices={supportedGamesChoices}
        selected={Object.keys(config.selectedGames)}
        addSelected={(gameId) =>
          setConfig({
            ...config,
            selectedGames: {
              ...config.selectedGames,
              [gameId]: {
                parserOptions: supportedGamesHashMap[gameId].enforcedOpts,
              },
            },
          })
        }
        removeSelected={(gameId) =>
          setConfig({
            ...config,
            selectedGames: Object.fromEntries(
              Object.entries(config.selectedGames).filter(
                ([key]) => key !== gameId,
              ),
            ),
          })
        }
      />
    </div>
  )
}

interface MultiSelectorChoice {
  label: string
  value: string
}
export const MultiSelector = ({
  choices,
  selected,
  addSelected,
  removeSelected,
}: {
  choices: MultiSelectorChoice[]
  selected: string[]
  addSelected: (gameId: string) => void
  removeSelected: (gameId: string) => void
}) => {
  const [filterText, setFilterText] = useState("")
  const filteredChoices = useMemo(() => {
    if (!filterText) return choices
    return choices.filter((choice) =>
      choice.label.toLowerCase().includes(filterText.toLowerCase()),
    )
  }, [choices, filterText])

  return (
    <div className="w-60">
      <div>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search"
          className="outline-none border-1 border-gray-300 rounded-md px-2 my-1 mb-2"
        />
      </div>
      <div>
        {filteredChoices.map((choice) => (
          <div
            key={choice.value}
            className={clsx(
              "flex items-center gap-2 cursor-pointer select-none opacity-50 hover:opacity-100 transition-opacity duration-100",
              selected.includes(choice.value) && "opacity-100",
            )}
            onClick={() =>
              selected.includes(choice.value)
                ? removeSelected(choice.value)
                : addSelected(choice.value)
            }
          >
            <input
              type="checkbox"
              checked={selected.includes(choice.value)}
              readOnly
            />
            {choice.label}
          </div>
        ))}
      </div>
    </div>
  )
}
