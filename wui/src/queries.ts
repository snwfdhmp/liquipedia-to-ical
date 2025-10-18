import {
  QueryClient,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query"
import { createIcsUrlFromConfig } from "./utils"
import { type Config } from "./hooks/useConfig"
import { useEffect } from "react"
import { useConfig } from "./hooks/useConfig"
export const queryClient = new QueryClient()

export const useIcs = (): UseQueryResult<string, Error> => {
  const { icsUrl } = useConfig()
  const icsRequest = useQuery({
    queryKey: ["ics", icsUrl],
    queryFn: () => fetch(icsUrl).then((res) => res.text()),
  })

  useEffect(() => {
    icsRequest.refetch()
  }, [icsUrl])
  return icsRequest
}
