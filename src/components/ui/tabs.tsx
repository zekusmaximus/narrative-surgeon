import React from 'react'

export type TabsProps = React.PropsWithChildren<{
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}>

const TabsContext = React.createContext<{
  value: string | undefined
  setValue: (v: string) => void
}>({
  value: undefined,
  setValue: () => {}
})

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, className, children }) => {
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
  const current = value !== undefined ? value : internal
  const setValue = (v: string) => {
    if (onValueChange) onValueChange(v)
    if (value === undefined) setInternal(v)
  }
  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>
export const TabsList: React.FC<TabsListProps> = ({ children, ...props }) => {
  return (
    <div role="tablist" {...props}>
      {children}
    </div>
  )
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}
export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, ...props }) => {
  const { value: current, setValue } = React.useContext(TabsContext)
  const selected = current === value
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => setValue(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
}
export const TabsContent: React.FC<TabsContentProps> = ({ value, children, ...props }) => {
  const { value: current } = React.useContext(TabsContext)
  if (current !== value) return null
  return (
    <div role="tabpanel" {...props}>
      {children}
    </div>
  )
}

export default Tabs
