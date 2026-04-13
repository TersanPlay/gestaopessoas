import * as React from "react"

import { cn } from "@/lib/utils"

type TabsValue = string

type TabsContextValue = {
  baseId: string
  value: TabsValue
  setValue: (nextValue: TabsValue) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

const useTabsContext = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within <Tabs />")
  }
  return context
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue: TabsValue
  value?: TabsValue
  onValueChange?: (nextValue: TabsValue) => void
  className?: string
  children: React.ReactNode
}) {
  const baseId = React.useId()
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState<TabsValue>(defaultValue)

  const value = controlledValue ?? uncontrolledValue

  const setValue = React.useCallback(
    (nextValue: TabsValue) => {
      onValueChange?.(nextValue)
      if (controlledValue === undefined) {
        setUncontrolledValue(nextValue)
      }
    },
    [controlledValue, onValueChange],
  )

  return (
    <div className={cn(className)}>
      <TabsContext.Provider value={{ baseId, value, setValue }}>
        {children}
      </TabsContext.Provider>
    </div>
  )
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  value,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: TabsValue }) {
  const { baseId, value: activeValue, setValue } = useTabsContext()
  const isActive = activeValue === value
  const triggerId = `${baseId}-trigger-${value}`
  const contentId = `${baseId}-content-${value}`

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={isActive}
      aria-controls={contentId}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? "active" : "inactive"}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className,
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  )
}

export function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: TabsValue }) {
  const { baseId, value: activeValue } = useTabsContext()
  const isActive = activeValue === value
  const triggerId = `${baseId}-trigger-${value}`
  const contentId = `${baseId}-content-${value}`

  return (
    <div
      role="tabpanel"
      id={contentId}
      aria-labelledby={triggerId}
      hidden={!isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(className)}
      {...props}
    />
  )
}

