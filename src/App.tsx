import { Fragment, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Status = "healthy" | "failed" | "timeout" | "running"
type Filter = "all" | "failed" | "running"

type Automation = {
  id: string
  name: string
  trigger: "webhook" | "cron" | "pipeline" | "agent"
  team: string
  status: Status
  lastRun: string
  runs24h: number
  failedRuns: number
}

type Execution = {
  id: string
  time: string
  automation: string
  status: Status
  duration: string
}

const automations: Automation[] = [
  {
    id: "invoice-sync",
    name: "Invoice sync",
    trigger: "webhook",
    team: "data-team",
    status: "failed",
    lastRun: "14:02",
    runs24h: 12,
    failedRuns: 3,
  },
  {
    id: "lead-scorer",
    name: "Lead scorer",
    trigger: "cron",
    team: "growth",
    status: "timeout",
    lastRun: "13:58",
    runs24h: 5,
    failedRuns: 2,
  },
  {
    id: "crm-enrich",
    name: "CRM enrich",
    trigger: "pipeline",
    team: "growth",
    status: "healthy",
    lastRun: "14:00",
    runs24h: 24,
    failedRuns: 0,
  },
  {
    id: "support-triage",
    name: "Support triage agent",
    trigger: "agent",
    team: "support",
    status: "running",
    lastRun: "13:55",
    runs24h: 8,
    failedRuns: 0,
  },
  {
    id: "nightly-export",
    name: "Nightly export",
    trigger: "cron",
    team: "ops",
    status: "healthy",
    lastRun: "03:00",
    runs24h: 1,
    failedRuns: 0,
  },
]

const executions: Execution[] = [
  {
    id: "e1",
    time: "14:02:11",
    automation: "Invoice sync",
    status: "failed",
    duration: "4.2s",
  },
  {
    id: "e2",
    time: "14:00:03",
    automation: "CRM enrich",
    status: "healthy",
    duration: "12.1s",
  },
  {
    id: "e3",
    time: "13:58:40",
    automation: "Lead scorer",
    status: "timeout",
    duration: "30.0s",
  },
  {
    id: "e4",
    time: "13:55:02",
    automation: "Support triage agent",
    status: "running",
    duration: "—",
  },
  {
    id: "e5",
    time: "13:50:17",
    automation: "Invoice sync",
    status: "healthy",
    duration: "3.9s",
  },
]

const statusLabel: Record<Status, string> = {
  healthy: "OK",
  failed: "Failed",
  timeout: "Timeout",
  running: "Running",
}

const dotTone: Record<Status, string> = {
  healthy: "bg-muted-foreground",
  failed: "bg-destructive",
  timeout: "bg-warning",
  running: "bg-accent-signal",
}

const stripeTone: Record<Status, string> = {
  healthy: "bg-transparent",
  failed: "bg-destructive",
  timeout: "bg-warning",
  running: "bg-accent-signal",
}

function successRate(automation: Automation) {
  const succeeded = automation.runs24h - automation.failedRuns
  return `${((succeeded / automation.runs24h) * 100).toFixed(1)}%`
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "failed") {
    return <Badge variant="destructive">{statusLabel[status]}</Badge>
  }

  return (
    <Badge variant="outline">
      <span className={cn("size-1.5 rounded-full", dotTone[status])} />
      {statusLabel[status]}
    </Badge>
  )
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </div>
  )
}

function QueueItem({
  automation,
  onRetry,
}: {
  automation: Automation
  onRetry: (id: string) => void
}) {
  const detail =
    automation.status === "timeout"
      ? `${automation.failedRuns} of ${automation.runs24h} runs timed out`
      : `${automation.failedRuns} failed runs`

  return (
    <div className="relative flex flex-col gap-2 py-3 pl-4">
      <span
        className={cn(
          "absolute inset-y-3 left-0 w-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
          stripeTone[automation.status]
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{automation.name}</span>
        <StatusBadge status={automation.status} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{detail}</span>
        <span className="tabular-nums">last {automation.lastRun}</span>
      </div>
      <div className="flex gap-2">
        {automation.status === "failed" && (
          <Button
            size="sm"
            className="bg-accent-signal text-background hover:bg-accent-signal/80"
            onClick={() => onRetry(automation.id)}
          >
            Retry
          </Button>
        )}
        <Button size="sm" variant="outline">
          Open logs
        </Button>
      </div>
    </div>
  )
}

export function App() {
  const [filter, setFilter] = useState<Filter>("all")
  const [retried, setRetried] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 400)
    return () => window.clearTimeout(timer)
  }, [])

  const rows = automations.map((automation): Automation => ({
    ...automation,
    status: retried.includes(automation.id) ? "running" : automation.status,
  }))

  const queue = rows.filter((automation) => automation.status !== "healthy")
  const visible =
    filter === "all" ? rows : rows.filter((row) => row.status === filter)

  const totalRuns = rows.reduce((sum, row) => sum + row.runs24h, 0)
  const totalFailed = rows.reduce((sum, row) => sum + row.failedRuns, 0)
  const failing = rows.filter(
    (row) => row.status === "failed" || row.status === "timeout"
  ).length

  const kpis = [
    { label: "active", value: rows.length },
    { label: "failing", value: failing },
    { label: "runs", value: totalRuns },
    {
      label: "success",
      value: `${(((totalRuns - totalFailed) / totalRuns) * 100).toFixed(1)}%`,
    },
  ]

  const handleRetry = (id: string) => {
    setRetried((current) => [...current, id])
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.01em]">
          Automations
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Last 24h</Badge>
          <Button variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {kpis.map((kpi, index) => (
          <Fragment key={kpi.label}>
            {index > 0 && (
              <Separator
                orientation="vertical"
                className="hidden h-8 sm:block"
              />
            )}
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">
                {kpi.value}
              </span>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
          </Fragment>
        ))}
      </section>

      <div className="flex animate-in flex-col gap-4 duration-200 fade-in motion-reduce:animate-none">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardAction>
                <Badge variant="secondary">{queue.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingRows />
              ) : queue.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Nothing needs attention</EmptyTitle>
                    <EmptyDescription>
                      All automations are healthy in this window.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                queue.map((automation, index) => (
                  <Fragment key={automation.id}>
                    {index > 0 && <Separator />}
                    <QueueItem automation={automation} onRetry={handleRetry} />
                  </Fragment>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent executions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingRows />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Automation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="tabular-nums">
                          {execution.time}
                        </TableCell>
                        <TableCell>{execution.automation}</TableCell>
                        <TableCell>
                          <StatusBadge status={execution.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {execution.duration}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All automations</CardTitle>
            <CardAction>
              <Tabs
                value={filter}
                onValueChange={(value) => setFilter(value as Filter)}
              >
                <TabsList>
                  <TabsTrigger
                    value="all"
                    className="data-active:text-accent-signal"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="failed"
                    className="data-active:text-accent-signal"
                  >
                    Failing
                  </TabsTrigger>
                  <TabsTrigger
                    value="running"
                    className="data-active:text-accent-signal"
                  >
                    Running
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingRows />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead className="text-right">24h success</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((automation) => (
                    <TableRow key={automation.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{automation.name}</span>
                          <span className="flex gap-3 text-xs text-muted-foreground">
                            <span>{automation.trigger}</span>
                            <span>{automation.team}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={automation.status} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {automation.lastRun}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {successRate(automation)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default App
