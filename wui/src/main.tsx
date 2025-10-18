import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { DataProvider } from "@/hooks/useData"
import { ConfigProvider } from "@/hooks/useConfig"

import { HomeView } from "@/views/home/view"

import "./global.css"
import { queryClient } from "./queries"
import { QueryClientProvider } from "@tanstack/react-query"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const providers = [ConfigProvider, DataProvider]
  return providers.reduce((acc, Provider) => {
    return <Provider>{acc}</Provider>
  }, children)
}

const RootContainer = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Providers>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeView />} />
          </Routes>
        </BrowserRouter>
      </Providers>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootContainer />
  </StrictMode>,
)
