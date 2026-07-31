'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Database, BarChart3, GitBranch, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImpactNodeData {
  label: string
  type: 'dataset' | 'dashboard' | 'model' | 'pipeline'
  impact: 'high' | 'medium' | 'low'
  description?: string
}

const nodeTypes: NodeTypes = {
  dataset: DatasetNode,
  dashboard: DashboardNode,
  model: ModelNode,
  pipeline: PipelineNode,
}

function DatasetNode({ data }: { data: ImpactNodeData }) {
  return (
    <div className={cn(
      'px-4 py-2 rounded-lg border-2 bg-background min-w-[150px]',
      data.impact === 'high' && 'border-red-500/50',
      data.impact === 'medium' && 'border-yellow-500/50',
      data.impact === 'low' && 'border-green-500/50'
    )}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
      )}
    </div>
  )
}

function DashboardNode({ data }: { data: ImpactNodeData }) {
  return (
    <div className={cn(
      'px-4 py-2 rounded-lg border-2 bg-background min-w-[150px]',
      data.impact === 'high' && 'border-red-500/50',
      data.impact === 'medium' && 'border-yellow-500/50',
      data.impact === 'low' && 'border-green-500/50'
    )}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
      )}
    </div>
  )
}

function ModelNode({ data }: { data: ImpactNodeData }) {
  return (
    <div className={cn(
      'px-4 py-2 rounded-lg border-2 bg-background min-w-[150px]',
      data.impact === 'high' && 'border-red-500/50',
      data.impact === 'medium' && 'border-yellow-500/50',
      data.impact === 'low' && 'border-green-500/50'
    )}>
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
      )}
    </div>
  )
}

function PipelineNode({ data }: { data: ImpactNodeData }) {
  return (
    <div className={cn(
      'px-4 py-2 rounded-lg border-2 bg-background min-w-[150px]',
      data.impact === 'high' && 'border-red-500/50',
      data.impact === 'medium' && 'border-yellow-500/50',
      data.impact === 'low' && 'border-green-500/50'
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
      )}
    </div>
  )
}

interface ImpactGraphProps {
  className?: string
}

export function ImpactGraph({ className }: ImpactGraphProps) {
  const initialNodes: Node<ImpactNodeData>[] = [
    {
      id: '1',
      type: 'dataset',
      position: { x: 250, y: 0 },
      data: {
        label: 'customers',
        type: 'dataset',
        impact: 'high',
        description: 'Primary dataset being modified',
      },
    },
    {
      id: '2',
      type: 'model',
      position: { x: 100, y: 150 },
      data: {
        label: 'customer_orders',
        type: 'model',
        impact: 'medium',
        description: 'dbt model referencing customers',
      },
    },
    {
      id: '3',
      type: 'model',
      position: { x: 250, y: 150 },
      data: {
        label: 'customer_analytics',
        type: 'model',
        impact: 'medium',
        description: 'dbt model for analytics',
      },
    },
    {
      id: '4',
      type: 'model',
      position: { x: 400, y: 150 },
      data: {
        label: 'customer_segments',
        type: 'model',
        impact: 'medium',
        description: 'Customer segmentation model',
      },
    },
    {
      id: '5',
      type: 'dashboard',
      position: { x: 100, y: 300 },
      data: {
        label: 'Customer Overview',
        type: 'dashboard',
        impact: 'low',
        description: 'Main customer dashboard',
      },
    },
    {
      id: '6',
      type: 'dashboard',
      position: { x: 250, y: 300 },
      data: {
        label: 'Sales Report',
        type: 'dashboard',
        impact: 'low',
        description: 'Sales analytics dashboard',
      },
    },
    {
      id: '7',
      type: 'pipeline',
      position: { x: 400, y: 300 },
      data: {
        label: 'ETL Pipeline',
        type: 'pipeline',
        impact: 'medium',
        description: 'Nightly ETL job',
      },
    },
  ]

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3', animated: true },
    { id: 'e1-4', source: '1', target: '4', animated: true },
    { id: 'e2-5', source: '2', target: '5', animated: true },
    { id: 'e3-6', source: '3', target: '6', animated: true },
    { id: 'e4-7', source: '4', target: '7', animated: true },
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className={cn('h-[500px] w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as ImpactNodeData
            if (data.impact === 'high') return '#ef4444'
            if (data.impact === 'medium') return '#eab308'
            return '#22c55e'
          }}
          className="!bg-background !border-border"
        />
      </ReactFlow>
    </div>
  )
}
