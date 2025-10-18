import React, { createContext, useContext, useMemo, useState } from "react"

const DataContext = createContext<any>(undefined)

export const DataProvider: React.FC<any> = ({ children }) => {
  const [data, setData] = useState<any>({})

  const values = useMemo(() => ({ data, setData }), [data, setData])

  return <DataContext.Provider value={values}>{children}</DataContext.Provider>
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
