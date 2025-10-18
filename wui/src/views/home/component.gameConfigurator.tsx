import { useConfig } from "@/hooks/useConfig"
import { supportedGamesHashMap } from "../../../../meta/supportedGames"
import { useMemo, useState } from "react"
import { apiOptions, type ApiOption } from "../../../../meta/apiOptions"

export function GameConfigurator({ gameId }: { gameId: string }) {
  const { config, setConfig } = useConfig()
  const gameConfig = useMemo(
    () => config.selectedGames[gameId],
    [config, gameId],
  )
  const addFilter = (filter: string) => {
    let defaultValue = null
    switch (apiOptions[filter as keyof ParserOptions].kind) {
      case "string":
        defaultValue = ""
        break
      case "boolean":
        defaultValue = true
        break
      case "number":
        defaultValue = 0
        break
    }
    setConfig({
      ...config,
      selectedGames: {
        ...config.selectedGames,
        [gameId]: {
          ...gameConfig,
          parserOptions: {
            ...gameConfig.parserOptions,
            [filter]: defaultValue,
          },
        },
      },
    })
  }

  const updateFilterValue = (filter: string, value: string) => {
    setConfig({
      ...config,
      selectedGames: {
        ...config.selectedGames,
        [gameId]: {
          ...gameConfig,
          parserOptions: { ...gameConfig.parserOptions, [filter]: value },
        },
      },
    })
  }

  const removeFilter = (filter: string) => {
    const newParserOptions = { ...gameConfig.parserOptions }
    delete newParserOptions[filter]
    setConfig({
      ...config,
      selectedGames: {
        ...config.selectedGames,
        [gameId]: {
          ...gameConfig,
          parserOptions: newParserOptions,
        },
      },
    })
  }

  const parsedFilterOptions = useMemo(() => {
    return Object.entries(gameConfig?.parserOptions || {}).map(
      ([key, value]) => {
        return {
          key,
          value,
        }
      },
    )
  }, [gameConfig?.parserOptions])

  return (
    <div>
      <div className="text-lg pl-6">{supportedGamesHashMap[gameId].name}</div>
      <div className="pl-8">
        {!gameConfig.parserOptions ||
        Object.keys(gameConfig.parserOptions).length === 0 ? (
          <div className="pl-1 border-l-2 border-gray-300">
            All events (no filters)
          </div>
        ) : (
          <div className="pl-1 border-l-2 border-gray-300">
            {parsedFilterOptions.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-300"
                  onClick={() => removeFilter(key)}
                >
                  x
                </div>
                {apiOptions[key as keyof ParserOptions].title}
                {["string", "number"].includes(
                  apiOptions[key as keyof ParserOptions].kind,
                ) && (
                  <>
                    :{" "}
                    <input
                      type={
                        apiOptions[key as keyof ParserOptions].kind === "number"
                          ? "number"
                          : "text"
                      }
                      value={value}
                      onChange={(e) => updateFilterValue(key, e.target.value)}
                      className="border-b border-gray-300 outline-none"
                      placeholder="Enter value"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <GameConfiguratorFiltersSelector
          gameId={gameId}
          addFilter={addFilter}
        />
      </div>
    </div>
  )
}

export function GameConfiguratorFiltersSelector({
  gameId,
  addFilter,
}: {
  gameId: string
  addFilter: (filter: string) => void
}) {
  const [value, setValue] = useState<string | null>(null)
  const { config } = useConfig()
  const gameConfig = useMemo(
    () => config.selectedGames[gameId],
    [config, gameId],
  )
  const alreadyAddedFilters = useMemo(() => {
    return Object.keys(gameConfig?.parserOptions || {})
  }, [gameConfig?.parserOptions])

  return (
    <select
      className="opacity-50 hover:opacity-100 hover:underline transition-opacity duration-300 cursor-pointer outline-none p-0 m-0 border-l-2 border-gray-300"
      onChange={(e) => {
        addFilter(e.target.value)
        setValue("selector")
        e.preventDefault()
        e.stopPropagation()
      }}
      value={value}
    >
      <option value={"selector"} selected>
        Add filters
      </option>
      {Object.entries(apiOptions)
        .filter(
          ([id, option]: [string, ApiOption]) =>
            (option.shouldShowInUi?.(gameConfig?.parserOptions || {}) ??
              true) &&
            !alreadyAddedFilters.includes(id),
        )
        .map(([key, option]) => (
          <option key={key} value={key}>
            {option.title}
          </option>
        ))}
    </select>
  )
}
