'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { uploadAndTrainDocument, getDocuments, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  RiDashboardLine,
  RiFolderAddLine,
  RiGridLine,
  RiSearchLine,
  RiSettings3Line,
  RiBookmarkLine,
  RiLinkM,
  RiFilePdfLine,
  RiImageLine,
  RiYoutubeLine,
  RiTerminalLine,
  RiArrowRightLine,
  RiCloseLine,
  RiCheckLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiDatabase2Line,
  RiGlobalLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFilterLine,
  RiRefreshLine,
  RiInformationLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiSparklingLine,
} from 'react-icons/ri'

// =============================================
// CONSTANTS
// =============================================

const RAG_ID = '699eaa51b45a5c2df19082eb'

const AGENT_IDS = {
  resourceProcessor: '699eaac2fef44557ea6f39ff',
  knowledgeOrchestrator: '699eaa9e12ee8368eec5f693',
  kbRetrieval: '699eaa6d36d6a922b7ae5689',
  webResearch: '699eaa6d36d6a922b7ae568b',
  outputDelivery: '699eaac3b17c6b5799e16d79',
}

const AGENTS_INFO = [
  { id: AGENT_IDS.resourceProcessor, name: 'Resource Processor', purpose: 'Extracts, summarizes, and categorizes uploaded resources' },
  { id: AGENT_IDS.knowledgeOrchestrator, name: 'Knowledge Orchestrator', purpose: 'Coordinates KB retrieval and web research to answer queries' },
  { id: AGENT_IDS.kbRetrieval, name: 'KB Retrieval Agent', purpose: 'Searches indexed knowledge base for relevant content' },
  { id: AGENT_IDS.webResearch, name: 'Web Research Agent', purpose: 'Performs live web research for current information' },
  { id: AGENT_IDS.outputDelivery, name: 'Output Delivery', purpose: 'Exports content as PDF or pushes to Notion' },
]

const DEFAULT_CATEGORIES = [
  'AI Agents & Automation',
  'Machine Learning',
  'Web Development',
  'Data Science',
  'Cloud Computing',
  'Cybersecurity',
  'DevOps & CI/CD',
  'Mobile Development',
  'Blockchain & Web3',
  'UI/UX Design',
  'Natural Language Processing',
  'Computer Vision',
  'Backend Engineering',
  'Frontend Frameworks',
  'Database Systems',
]

type ScreenType = 'dashboard' | 'resources' | 'categories' | 'query' | 'settings'

// =============================================
// INTERFACES
// =============================================

interface CategorizedResource {
  title: string
  source_type: string
  url: string
  summary: string
  key_takeaways: string[]
  primary_category: string
  secondary_categories: string[]
  processing_status: string
}

interface ComparisonItem {
  name: string
  pricing: string
  rating: string
  key_features: string
  best_for: string
}

interface SourceItem {
  title: string
  url: string
  type: string
}

interface QueryResponse {
  query: string
  summary: string
  detailed_analysis: string
  comparison_table: ComparisonItem[]
  sources: SourceItem[]
  recommendation: string
  kb_results_used: number
  web_results_used: number
  message: string
}

interface ConversationEntry {
  id: string
  query: string
  response: QueryResponse | null
  timestamp: string
}

interface BookmarkItem {
  id: string
  url: string
  title: string
}

interface PromptItem {
  id: string
  name: string
  text: string
  category: string
}

interface YouTubeItem {
  id: string
  url: string
  title: string
}

// =============================================
// HELPERS
// =============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

// =============================================
// SAMPLE DATA
// =============================================

const SAMPLE_RESOURCES: CategorizedResource[] = [
  {
    title: 'Building Production-Ready AI Agents with LangChain',
    source_type: 'bookmark',
    url: 'https://example.com/langchain-agents',
    summary: 'Comprehensive guide covering agent architectures, tool integration patterns, memory management, and deployment strategies for production AI agent systems.',
    key_takeaways: ['ReAct pattern for tool selection', 'Structured output parsing', 'Conversation buffer memory optimization'],
    primary_category: 'AI Agents & Automation',
    secondary_categories: ['Machine Learning', 'Backend Engineering'],
    processing_status: 'completed',
  },
  {
    title: 'Next.js 15 App Router Deep Dive',
    source_type: 'pdf',
    url: 'https://example.com/nextjs-15.pdf',
    summary: 'Technical analysis of the new App Router architecture including server components, streaming, parallel routes, and intercepting routes with performance benchmarks.',
    key_takeaways: ['Server components reduce bundle size by 40%', 'Streaming SSR improves TTFB', 'Route groups for layout isolation'],
    primary_category: 'Web Development',
    secondary_categories: ['Frontend Frameworks'],
    processing_status: 'completed',
  },
  {
    title: 'Kubernetes Security Best Practices 2025',
    source_type: 'bookmark',
    url: 'https://example.com/k8s-security',
    summary: 'Updated security hardening guide for Kubernetes clusters covering RBAC, network policies, pod security standards, and supply chain security.',
    key_takeaways: ['Pod Security Admission replaces PSPs', 'Network policy default deny', 'Image signing with Sigstore'],
    primary_category: 'Cybersecurity',
    secondary_categories: ['DevOps & CI/CD', 'Cloud Computing'],
    processing_status: 'completed',
  },
  {
    title: 'Transformer Architecture Visual Explainer',
    source_type: 'image',
    url: 'https://example.com/transformer-visual',
    summary: 'Visual breakdown of multi-head attention, positional encoding, and feed-forward layers in transformer models with annotated diagrams.',
    key_takeaways: ['Self-attention scales quadratically', 'Positional encoding captures sequence order', 'Layer normalization stabilizes training'],
    primary_category: 'Machine Learning',
    secondary_categories: ['Natural Language Processing', 'Computer Vision'],
    processing_status: 'completed',
  },
  {
    title: 'PostgreSQL Performance Tuning Masterclass',
    source_type: 'youtube',
    url: 'https://youtube.com/watch?v=example',
    summary: 'Advanced PostgreSQL optimization techniques including query planning, indexing strategies, connection pooling, and partitioning for high-throughput workloads.',
    key_takeaways: ['BRIN indexes for time-series data', 'PgBouncer for connection pooling', 'EXPLAIN ANALYZE for query optimization'],
    primary_category: 'Database Systems',
    secondary_categories: ['Backend Engineering'],
    processing_status: 'completed',
  },
]

const SAMPLE_CONVERSATIONS: ConversationEntry[] = [
  {
    id: 'sample-1',
    query: 'What are the best practices for building AI agent systems?',
    response: {
      query: 'What are the best practices for building AI agent systems?',
      summary: 'Building effective AI agent systems requires careful attention to architecture, tool integration, memory management, and observability. The ReAct pattern remains the most widely adopted approach.',
      detailed_analysis: '## Architecture Patterns\n\nThe most successful AI agent architectures follow the **ReAct** (Reasoning + Acting) pattern, where the agent alternates between reasoning about the current state and taking actions.\n\n## Key Considerations\n\n- **Tool Selection**: Agents should have access to a well-defined set of tools with clear descriptions\n- **Memory Management**: Use conversation buffer memory for short contexts, summary memory for long ones\n- **Error Handling**: Implement retry logic with exponential backoff for tool failures\n- **Observability**: Log all agent decisions and tool calls for debugging\n\n## Production Readiness\n\n1. Rate limiting on external API calls\n2. Token budget management\n3. Fallback strategies when tools fail\n4. Human-in-the-loop for high-stakes decisions',
      comparison_table: [
        { name: 'LangChain', pricing: 'Open Source', rating: '4.5/5', key_features: 'Extensive tool ecosystem, LCEL', best_for: 'Complex multi-step agents' },
        { name: 'CrewAI', pricing: 'Open Source', rating: '4.2/5', key_features: 'Multi-agent collaboration, roles', best_for: 'Team-based agent workflows' },
        { name: 'AutoGen', pricing: 'Open Source', rating: '4.0/5', key_features: 'Conversational agents, code execution', best_for: 'Research and prototyping' },
      ],
      sources: [
        { title: 'Building Production-Ready AI Agents with LangChain', url: 'https://example.com/langchain-agents', type: 'kb' },
        { title: 'AI Agent Design Patterns 2025', url: 'https://example.com/agent-patterns', type: 'web' },
      ],
      recommendation: 'Start with LangChain for its mature ecosystem and extensive documentation. Use CrewAI if your use case involves multiple specialized agents collaborating.',
      kb_results_used: 3,
      web_results_used: 5,
      message: 'Analysis complete with 3 knowledge base and 5 web sources.',
    },
    timestamp: '2025-02-24T14:30:00Z',
  },
]

// =============================================
// ERROR BOUNDARY
// =============================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// =============================================
// SUB-COMPONENTS
// =============================================

function GoldGlow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('shadow-[0_0_15px_rgba(191,155,48,0.3)]', className)}>
      {children}
    </div>
  )
}

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  if (!message) return null
  const colors = {
    success: 'text-green-400 bg-green-400/10 border-green-400/20',
    error: 'text-destructive bg-destructive/10 border-destructive/20',
    info: 'text-primary bg-primary/10 border-primary/20',
  }
  return (
    <div className={cn('px-4 py-2 text-sm border mt-2', colors[type])}>
      {type === 'success' && <RiCheckLine className="inline mr-2" />}
      {type === 'error' && <RiCloseLine className="inline mr-2" />}
      {type === 'info' && <RiInformationLine className="inline mr-2" />}
      {message}
    </div>
  )
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted animate-pulse w-3/4" />
          <div className="h-3 bg-muted animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  )
}

function AgentActivityIndicator({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground tracking-wider uppercase mb-3">Agent Status</p>
      <div className="space-y-1.5">
        {AGENTS_INFO.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2 text-xs">
            <div className={cn('w-1.5 h-1.5 flex-shrink-0', activeAgentId === agent.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30')} />
            <span className={cn('truncate', activeAgentId === agent.id ? 'text-primary font-medium' : 'text-muted-foreground')}>
              {agent.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SourceTypeIcon({ type }: { type: string }) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('pdf')) return <RiFilePdfLine className="w-4 h-4" />
  if (t.includes('bookmark') || t.includes('link')) return <RiBookmarkLine className="w-4 h-4" />
  if (t.includes('image')) return <RiImageLine className="w-4 h-4" />
  if (t.includes('youtube') || t.includes('video')) return <RiYoutubeLine className="w-4 h-4" />
  if (t.includes('prompt')) return <RiTerminalLine className="w-4 h-4" />
  return <RiLinkM className="w-4 h-4" />
}

// =============================================
// SCREEN: DASHBOARD
// =============================================

function DashboardScreen({
  categorizedResources,
  categories,
  onNavigate,
  onSearchRoute,
  sampleMode,
}: {
  categorizedResources: CategorizedResource[]
  categories: string[]
  onNavigate: (screen: ScreenType) => void
  onSearchRoute: (query: string) => void
  sampleMode: boolean
}) {
  const [quickSearch, setQuickSearch] = useState('')
  const displayResources = sampleMode && categorizedResources.length === 0 ? SAMPLE_RESOURCES : categorizedResources
  const totalResources = displayResources.length
  const activeCategories = new Set(displayResources.map((r) => r?.primary_category).filter(Boolean)).size
  const queriesThisWeek = sampleMode ? 12 : 0

  const categoryCounts: Record<string, number> = {}
  displayResources.forEach((r) => {
    const cat = r?.primary_category
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }
  })

  const handleQuickSearch = () => {
    if (quickSearch.trim()) {
      onSearchRoute(quickSearch.trim())
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-wider mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your knowledge at a glance</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Quick search your knowledge base..."
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
          className="bg-card border-border"
        />
        <Button onClick={handleQuickSearch} className="bg-primary text-primary-foreground shadow-[0_0_15px_rgba(191,155,48,0.3)] hover:shadow-[0_0_20px_rgba(191,155,48,0.4)] transition-all">
          <RiSearchLine className="mr-2 w-4 h-4" /> Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm border-border hover:shadow-[0_0_20px_rgba(191,155,48,0.1)] transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Resources</p>
              <RiDatabase2Line className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-light text-primary">{totalResources}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-border hover:shadow-[0_0_20px_rgba(191,155,48,0.1)] transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Categories</p>
              <RiGridLine className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-light text-primary">{activeCategories || categories.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-border hover:shadow-[0_0_20px_rgba(191,155,48,0.1)] transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Queries This Week</p>
              <RiSearchLine className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-light text-primary">{queriesThisWeek}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
              <RiRefreshLine className="w-4 h-4 text-primary" />
              Recently Added Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayResources.length === 0 ? (
              <div className="text-center py-8">
                <RiFolderAddLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No resources yet</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate('resources')}>
                  <RiAddLine className="mr-1 w-4 h-4" /> Add Resources
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3 pr-3">
                  {displayResources.slice(0, 10).map((r, i) => (
                    <div key={i} className="p-3 bg-secondary/50 border border-border hover:border-primary/30 transition-all cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                          <SourceTypeIcon type={r?.source_type ?? ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r?.title ?? 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r?.summary ?? ''}</p>
                          <Badge variant="outline" className="mt-1.5 text-xs">{r?.primary_category ?? 'Uncategorized'}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
              <RiGridLine className="w-4 h-4 text-primary" />
              Category Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="grid grid-cols-2 gap-2 pr-3">
                {categories.map((cat) => {
                  const count = categoryCounts[cat] || 0
                  return (
                    <div key={cat} className="p-3 bg-secondary/50 border border-border hover:border-primary/30 transition-all cursor-pointer" onClick={() => onNavigate('categories')}>
                      <p className="text-xs text-muted-foreground truncate">{cat}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-lg font-light text-primary">{count}</span>
                        <Badge variant="secondary" className="text-xs">{count > 0 ? 'Active' : 'Empty'}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =============================================
// SCREEN: RESOURCE MANAGER
// =============================================

function ResourceManagerScreen({
  categories,
  onProcess,
  processing,
  statusMessage,
  statusType,
  activeAgentId,
}: {
  categories: string[]
  onProcess: (summary: string) => void
  processing: boolean
  statusMessage: string
  statusType: 'success' | 'error' | 'info'
  activeAgentId: string | null
}) {
  const [activeTab, setActiveTab] = useState('topics')
  const [topicCategories, setTopicCategories] = useState<string[]>(categories)
  const [newCategory, setNewCategory] = useState('')
  const [toolBookmarks, setToolBookmarks] = useState<BookmarkItem[]>([])
  const [toolBookmarkInput, setToolBookmarkInput] = useState('')
  const [guideBookmarks, setGuideBookmarks] = useState<BookmarkItem[]>([])
  const [guideBookmarkInput, setGuideBookmarkInput] = useState('')
  const [uploadedPDFs, setUploadedPDFs] = useState<Array<{ name: string; size: number; status: string }>>([])
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfStatus, setPdfStatus] = useState('')
  const [imageFiles, setImageFiles] = useState<Array<{ name: string; url: string }>>([])
  const [imageUploading, setImageUploading] = useState(false)
  const [youtubeLinks, setYoutubeLinks] = useState<YouTubeItem[]>([])
  const [youtubeInput, setYoutubeInput] = useState('')
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [promptForm, setPromptForm] = useState({ name: '', text: '', category: categories[0] || '' })
  const [kbDocuments, setKbDocuments] = useState<Array<{ fileName: string; status?: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const loadKBDocuments = useCallback(async () => {
    const result = await getDocuments(RAG_ID)
    if (result.success && Array.isArray(result.documents)) {
      setKbDocuments(result.documents.map((d) => ({ fileName: d.fileName, status: d.status })))
    }
  }, [])

  useEffect(() => {
    loadKBDocuments()
  }, [loadKBDocuments])

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setPdfUploading(true)
    setPdfStatus('')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadedPDFs((prev) => [...prev, { name: file.name, size: file.size, status: 'uploading' }])
      const result = await uploadAndTrainDocument(RAG_ID, file)
      setUploadedPDFs((prev) =>
        prev.map((p) => (p.name === file.name ? { ...p, status: result.success ? 'trained' : 'error' } : p))
      )
    }
    setPdfUploading(false)
    setPdfStatus('Upload complete')
    await loadKBDocuments()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteKBDoc = async (fileName: string) => {
    const result = await deleteDocuments(RAG_ID, [fileName])
    if (result.success) {
      setKbDocuments((prev) => prev.filter((d) => d.fileName !== fileName))
      setPdfStatus(`Deleted ${fileName}`)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setImageUploading(true)
    const result = await uploadFiles(Array.from(files))
    if (result.success && Array.isArray(result.files)) {
      result.files.forEach((f) => {
        if (f.success) {
          setImageFiles((prev) => [...prev, { name: f.file_name, url: '' }])
        }
      })
    }
    setImageUploading(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const parseBookmarks = (input: string): BookmarkItem[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((url) => ({ id: generateId(), url, title: url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] }))
  }

  const handleAddToolBookmarks = () => {
    if (!toolBookmarkInput.trim()) return
    const parsed = parseBookmarks(toolBookmarkInput)
    setToolBookmarks((prev) => [...prev, ...parsed])
    setToolBookmarkInput('')
  }

  const handleAddGuideBookmarks = () => {
    if (!guideBookmarkInput.trim()) return
    const parsed = parseBookmarks(guideBookmarkInput)
    setGuideBookmarks((prev) => [...prev, ...parsed])
    setGuideBookmarkInput('')
  }

  const handleAddYouTube = () => {
    if (!youtubeInput.trim()) return
    setYoutubeLinks((prev) => [...prev, { id: generateId(), url: youtubeInput.trim(), title: youtubeInput.trim().replace(/https?:\/\/(www\.)?/, '').split('/')[0] }])
    setYoutubeInput('')
  }

  const handleAddPrompt = () => {
    if (!promptForm.name.trim() || !promptForm.text.trim()) return
    setPrompts((prev) => [...prev, { id: generateId(), ...promptForm }])
    setPromptForm({ name: '', text: '', category: categories[0] || '' })
  }

  const handleAddCategory = () => {
    if (!newCategory.trim() || topicCategories.includes(newCategory.trim())) return
    setTopicCategories((prev) => [...prev, newCategory.trim()])
    setNewCategory('')
  }

  const buildResourceSummary = () => ({
    categories: topicCategories,
    tool_bookmarks: toolBookmarks.map((b) => b.url),
    guide_bookmarks: guideBookmarks.map((b) => b.url),
    pdfs: uploadedPDFs.filter((p) => p.status === 'trained').map((p) => p.name),
    images: imageFiles.map((img) => img.name),
    youtube_channels: youtubeLinks.map((y) => y.url),
    shortcut_prompts: prompts.map((p) => ({ name: p.name, text: p.text, category: p.category })),
  })

  const handleProcessAll = () => {
    const summary = buildResourceSummary()
    onProcess(JSON.stringify(summary))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wider mb-1">Resource Manager</h1>
          <p className="text-sm text-muted-foreground">Organize and process your knowledge resources</p>
        </div>
        <GoldGlow>
          <Button onClick={handleProcessAll} disabled={processing} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            {processing ? (
              <>
                <RiSparklingLine className="mr-2 w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <RiSparklingLine className="mr-2 w-4 h-4" /> Process & Categorize
              </>
            )}
          </Button>
        </GoldGlow>
      </div>

      {processing && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RiSparklingLine className="w-5 h-5 text-primary animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">Processing resources...</p>
                <Progress value={undefined} className="mt-2 h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <StatusMessage message={statusMessage} type={statusType} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary border border-border w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="topics" className="text-xs tracking-wider"><RiGridLine className="mr-1.5 w-3.5 h-3.5" />Topics</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs tracking-wider"><RiBookmarkLine className="mr-1.5 w-3.5 h-3.5" />Tool Bookmarks</TabsTrigger>
          <TabsTrigger value="guides" className="text-xs tracking-wider"><RiLinkM className="mr-1.5 w-3.5 h-3.5" />Guide Bookmarks</TabsTrigger>
          <TabsTrigger value="pdfs" className="text-xs tracking-wider"><RiFilePdfLine className="mr-1.5 w-3.5 h-3.5" />PDFs</TabsTrigger>
          <TabsTrigger value="images" className="text-xs tracking-wider"><RiImageLine className="mr-1.5 w-3.5 h-3.5" />Images</TabsTrigger>
          <TabsTrigger value="youtube" className="text-xs tracking-wider"><RiYoutubeLine className="mr-1.5 w-3.5 h-3.5" />YouTube</TabsTrigger>
          <TabsTrigger value="prompts" className="text-xs tracking-wider"><RiTerminalLine className="mr-1.5 w-3.5 h-3.5" />Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Topic Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Add new category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} className="bg-secondary border-border" />
                <Button variant="outline" onClick={handleAddCategory}><RiAddLine className="w-4 h-4" /></Button>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5 pr-3">
                  {topicCategories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-secondary/50 border border-border hover:border-primary/30 transition-all group">
                      <span className="text-sm">{cat}</span>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0" onClick={() => setTopicCategories((prev) => prev.filter((_, idx) => idx !== i))}>
                        <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Tool Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Paste tool URLs here, one per line..." value={toolBookmarkInput} onChange={(e) => setToolBookmarkInput(e.target.value)} rows={5} className="bg-secondary border-border mb-3" />
              <Button variant="outline" onClick={handleAddToolBookmarks} className="mb-4"><RiAddLine className="mr-2 w-4 h-4" />Parse & Add</Button>
              {toolBookmarks.length > 0 && (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {toolBookmarks.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 p-2.5 bg-secondary/50 border border-border group">
                        <RiLinkM className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.url}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => setToolBookmarks((prev) => prev.filter((x) => x.id !== b.id))}>
                          <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {toolBookmarks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <RiBookmarkLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tool bookmarks added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Guide Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Paste guide URLs here, one per line..." value={guideBookmarkInput} onChange={(e) => setGuideBookmarkInput(e.target.value)} rows={5} className="bg-secondary border-border mb-3" />
              <Button variant="outline" onClick={handleAddGuideBookmarks} className="mb-4"><RiAddLine className="mr-2 w-4 h-4" />Parse & Add</Button>
              {guideBookmarks.length > 0 && (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {guideBookmarks.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 p-2.5 bg-secondary/50 border border-border group">
                        <RiLinkM className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.url}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => setGuideBookmarks((prev) => prev.filter((x) => x.id !== b.id))}>
                          <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {guideBookmarks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <RiBookmarkLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No guide bookmarks added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Resource PDFs</CardTitle>
            </CardHeader>
            <CardContent>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" multiple onChange={handlePDFUpload} className="hidden" />
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-primary/50 p-8 text-center cursor-pointer transition-all group">
                <RiFilePdfLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3 group-hover:text-primary/50 transition-colors" />
                <p className="text-sm text-muted-foreground">Drop PDF, DOCX, or TXT files here, or click to browse</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Files will be uploaded to the knowledge base</p>
              </div>
              {pdfUploading && <StatusMessage message="Uploading files..." type="info" />}
              {pdfStatus && <StatusMessage message={pdfStatus} type="success" />}

              {uploadedPDFs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Uploaded Files</p>
                  {uploadedPDFs.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2">
                        <RiFilePdfLine className="w-4 h-4 text-primary" />
                        <span className="text-sm">{f.name}</span>
                        <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Badge variant={f.status === 'trained' ? 'default' : f.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                        {f.status === 'trained' && <RiCheckLine className="mr-1 w-3 h-3" />}
                        {f.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {kbDocuments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Knowledge Base Documents</p>
                  {kbDocuments.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-secondary/50 border border-border group">
                      <div className="flex items-center gap-2">
                        <RiDatabase2Line className="w-4 h-4 text-primary" />
                        <span className="text-sm">{doc.fileName}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => handleDeleteKBDoc(doc.fileName)}>
                        <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Image Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-primary/50 p-8 text-center cursor-pointer transition-all group">
                <RiImageLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3 group-hover:text-primary/50 transition-colors" />
                <p className="text-sm text-muted-foreground">Upload image notes and screenshots</p>
              </div>
              {imageUploading && <StatusMessage message="Uploading images..." type="info" />}
              {imageFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {imageFiles.map((img, i) => (
                    <div key={i} className="p-3 bg-secondary/50 border border-border text-center group relative">
                      <RiImageLine className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground truncate">{img.name}</p>
                      <Button variant="ghost" size="sm" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0" onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                        <RiCloseLine className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {imageFiles.length === 0 && !imageUploading && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No images uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="youtube" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">YouTube Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Paste YouTube URL..." value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddYouTube()} className="bg-secondary border-border" />
                <Button variant="outline" onClick={handleAddYouTube}><RiAddLine className="w-4 h-4" /></Button>
              </div>
              {youtubeLinks.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {youtubeLinks.map((y) => (
                      <div key={y.id} className="flex items-center gap-3 p-2.5 bg-secondary/50 border border-border group">
                        <RiYoutubeLine className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{y.url}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => setYoutubeLinks((prev) => prev.filter((x) => x.id !== y.id))}>
                          <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <RiYoutubeLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No YouTube links added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="mt-4">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium tracking-wider uppercase">Shortcut Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <Input placeholder="Prompt name" value={promptForm.name} onChange={(e) => setPromptForm((prev) => ({ ...prev, name: e.target.value }))} className="bg-secondary border-border" />
                <Textarea placeholder="Prompt text..." value={promptForm.text} onChange={(e) => setPromptForm((prev) => ({ ...prev, text: e.target.value }))} rows={3} className="bg-secondary border-border" />
                <select value={promptForm.category} onChange={(e) => setPromptForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full p-2 bg-secondary border border-border text-foreground text-sm">
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={handleAddPrompt}><RiAddLine className="mr-2 w-4 h-4" />Add Prompt</Button>
              </div>
              {prompts.length > 0 ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2 pr-3">
                    {prompts.map((p) => (
                      <div key={p.id} className="p-3 bg-secondary/50 border border-border group">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{p.name}</p>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => setPrompts((prev) => prev.filter((x) => x.id !== p.id))}>
                            <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.text}</p>
                        <Badge variant="outline" className="mt-1.5 text-xs">{p.category}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <RiTerminalLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No prompts added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================
// SCREEN: CATEGORY BROWSER
// =============================================

function CategoryBrowserScreen({
  categorizedResources,
  categories,
  sampleMode,
}: {
  categorizedResources: CategorizedResource[]
  categories: string[]
  sampleMode: boolean
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<'title' | 'type'>('title')

  const displayResources = sampleMode && categorizedResources.length === 0 ? SAMPLE_RESOURCES : categorizedResources

  const categoryCounts: Record<string, number> = {}
  displayResources.forEach((r) => {
    const cat = r?.primary_category
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }
    const secs = Array.isArray(r?.secondary_categories) ? r.secondary_categories : []
    secs.forEach((sc) => {
      if (sc) categoryCounts[sc] = (categoryCounts[sc] || 0) + 1
    })
  })

  const filteredCategories = categories.filter((c) => c.toLowerCase().includes(searchFilter.toLowerCase()))

  const categoryResources = selectedCategory
    ? displayResources.filter((r) => {
        if (r?.primary_category === selectedCategory) return true
        const secs = Array.isArray(r?.secondary_categories) ? r.secondary_categories : []
        return secs.includes(selectedCategory)
      })
    : []

  const sortedResources = [...categoryResources].sort((a, b) => {
    if (sortBy === 'title') return (a?.title ?? '').localeCompare(b?.title ?? '')
    return (a?.source_type ?? '').localeCompare(b?.source_type ?? '')
  })

  const toggleExpand = (idx: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wider mb-1">Category Browser</h1>
        <p className="text-sm text-muted-foreground">Browse resources by category</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        <Card className="bg-card/80 backdrop-blur-sm border-border lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-wider uppercase">Categories</CardTitle>
            <Input placeholder="Filter categories..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="bg-secondary border-border mt-2" />
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-360px)]">
              <div className="space-y-0.5 px-4 pb-4">
                {filteredCategories.map((cat) => (
                  <div key={cat} onClick={() => setSelectedCategory(cat)} className={cn('flex items-center justify-between p-2.5 cursor-pointer transition-all', selectedCategory === cat ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/50 border-l-2 border-l-transparent')}>
                    <span className={cn('text-sm', selectedCategory === cat ? 'text-primary font-medium' : '')}>{cat}</span>
                    <Badge variant="secondary" className="text-xs">{categoryCounts[cat] || 0}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-wider uppercase">
                {selectedCategory ? selectedCategory : 'Select a category'}
              </CardTitle>
              {selectedCategory && (
                <div className="flex items-center gap-2">
                  <RiFilterLine className="w-4 h-4 text-muted-foreground" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'title' | 'type')} className="text-xs bg-secondary border border-border p-1 text-foreground">
                    <option value="title">By Title</option>
                    <option value="type">By Type</option>
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCategory ? (
              <div className="text-center py-16">
                <RiGridLine className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a category from the left panel to browse resources</p>
              </div>
            ) : sortedResources.length === 0 ? (
              <div className="text-center py-16">
                <RiFolderAddLine className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No resources in this category yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-360px)]">
                <div className="space-y-3 pr-3">
                  {sortedResources.map((r, i) => {
                    const isExpanded = expandedCards.has(i)
                    const takeaways = Array.isArray(r?.key_takeaways) ? r.key_takeaways : []
                    return (
                      <div key={i} className="p-4 bg-secondary/50 border border-border hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-muted-foreground">
                            <SourceTypeIcon type={r?.source_type ?? ''} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{r?.title ?? 'Untitled'}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {r?.url && (
                                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                    <RiExternalLinkLine className="w-4 h-4" />
                                  </a>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleExpand(i)}>
                                  {isExpanded ? <RiArrowUpLine className="w-3.5 h-3.5" /> : <RiArrowDownLine className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                            </div>
                            <p className={cn('text-xs text-muted-foreground mt-1', isExpanded ? '' : 'line-clamp-2')}>{r?.summary ?? ''}</p>
                            {isExpanded && takeaways.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <p className="text-xs text-primary uppercase tracking-wider">Key Takeaways</p>
                                {takeaways.map((t, ti) => (
                                  <div key={ti} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <RiArrowRightLine className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                                    <span>{t}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{r?.source_type ?? 'unknown'}</Badge>
                              {r?.processing_status === 'completed' && <Badge className="text-xs bg-green-400/10 text-green-400 border-green-400/20"><RiCheckLine className="mr-1 w-3 h-3" />Processed</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =============================================
// SCREEN: QUERY CONSOLE
// =============================================

function QueryConsoleScreen({
  conversations,
  setConversations,
  onQuery,
  querying,
  onExportPDF,
  onPushNotion,
  exporting,
  pushing,
  exportStatus,
  activeAgentId,
  initialQuery,
}: {
  conversations: ConversationEntry[]
  setConversations: React.Dispatch<React.SetStateAction<ConversationEntry[]>>
  onQuery: (q: string, web: boolean) => void
  querying: boolean
  onExportPDF: (data: QueryResponse) => void
  onPushNotion: (data: QueryResponse) => void
  exporting: boolean
  pushing: boolean
  exportStatus: string
  activeAgentId: string | null
  initialQuery: string
}) {
  const [queryInput, setQueryInput] = useState(initialQuery)
  const [includeWebSearch, setIncludeWebSearch] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialQuery) {
      setQueryInput(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversations])

  const handleSubmit = () => {
    if (!queryInput.trim() || querying) return
    onQuery(queryInput.trim(), includeWebSearch)
    setQueryInput('')
  }

  const handleCopy = async (entry: ConversationEntry) => {
    const resp = entry.response
    if (!resp) return
    const text = `Query: ${resp.query ?? ''}\n\nSummary: ${resp.summary ?? ''}\n\nAnalysis: ${resp.detailed_analysis ?? ''}\n\nRecommendation: ${resp.recommendation ?? ''}`
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-light tracking-wider mb-1">Query Console</h1>
        <p className="text-sm text-muted-foreground">Ask InfiniteMind anything about your knowledge base</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto pr-2 space-y-6">
          {conversations.length === 0 && !querying && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <RiSparklingLine className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                <h2 className="text-lg font-light tracking-wider mb-2">Ready to explore your knowledge</h2>
                <p className="text-sm text-muted-foreground">Ask a question below. InfiniteMind will search your knowledge base and optionally include live web research.</p>
              </div>
            </div>
          )}

          {conversations.map((entry) => (
            <div key={entry.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-primary/10 border border-primary/20 p-4 max-w-[80%]">
                  <p className="text-sm">{entry.query}</p>
                </div>
              </div>

              {entry.response ? (
                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-6 space-y-5">
                    {entry.response.summary && (
                      <div>
                        <p className="text-xs text-primary uppercase tracking-wider mb-2">Summary</p>
                        <div className="text-sm leading-relaxed">{renderMarkdown(entry.response.summary)}</div>
                      </div>
                    )}

                    {entry.response.detailed_analysis && (
                      <div>
                        <Separator className="mb-4" />
                        <p className="text-xs text-primary uppercase tracking-wider mb-2">Detailed Analysis</p>
                        <div className="text-sm leading-relaxed">{renderMarkdown(entry.response.detailed_analysis)}</div>
                      </div>
                    )}

                    {Array.isArray(entry.response.comparison_table) && entry.response.comparison_table.length > 0 && (
                      <div>
                        <Separator className="mb-4" />
                        <p className="text-xs text-primary uppercase tracking-wider mb-3">Comparison</p>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border">
                                <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                                <TableHead className="text-xs uppercase tracking-wider">Pricing</TableHead>
                                <TableHead className="text-xs uppercase tracking-wider">Rating</TableHead>
                                <TableHead className="text-xs uppercase tracking-wider">Key Features</TableHead>
                                <TableHead className="text-xs uppercase tracking-wider">Best For</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.response.comparison_table.map((item, ci) => (
                                <TableRow key={ci} className="border-border">
                                  <TableCell className="text-sm font-medium">{item?.name ?? ''}</TableCell>
                                  <TableCell className="text-sm">{item?.pricing ?? ''}</TableCell>
                                  <TableCell className="text-sm">{item?.rating ?? ''}</TableCell>
                                  <TableCell className="text-sm">{item?.key_features ?? ''}</TableCell>
                                  <TableCell className="text-sm">{item?.best_for ?? ''}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {Array.isArray(entry.response.sources) && entry.response.sources.length > 0 && (
                      <div>
                        <Separator className="mb-4" />
                        <p className="text-xs text-primary uppercase tracking-wider mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.response.sources.map((s, si) => (
                            <a key={si} href={s?.url ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border text-xs hover:border-primary/30 transition-all">
                              {(s?.type ?? '').toLowerCase() === 'kb' ? <RiDatabase2Line className="w-3 h-3 text-primary" /> : <RiGlobalLine className="w-3 h-3 text-accent" />}
                              {s?.title ?? s?.url ?? 'Source'}
                              <RiExternalLinkLine className="w-3 h-3 ml-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.response.recommendation && (
                      <div>
                        <Separator className="mb-4" />
                        <div className="p-4 bg-primary/5 border border-primary/20">
                          <p className="text-xs text-primary uppercase tracking-wider mb-2">Recommendation</p>
                          <div className="text-sm">{renderMarkdown(entry.response.recommendation)}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(entry.response.kb_results_used ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><RiDatabase2Line className="w-3 h-3" />{entry.response.kb_results_used} KB sources</span>
                        )}
                        {(entry.response.web_results_used ?? 0) > 0 && (
                          <span className="flex items-center gap-1"><RiGlobalLine className="w-3 h-3" />{entry.response.web_results_used} web sources</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => entry.response && onExportPDF(entry.response)} disabled={exporting}>
                          {exporting && activeAgentId === AGENT_IDS.outputDelivery ? <RiSparklingLine className="mr-1.5 w-3 h-3 animate-spin" /> : <RiDownloadLine className="mr-1.5 w-3 h-3" />}
                          Export PDF
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => entry.response && onPushNotion(entry.response)} disabled={pushing}>
                          {pushing ? <RiSparklingLine className="mr-1.5 w-3 h-3 animate-spin" /> : <RiExternalLinkLine className="mr-1.5 w-3 h-3" />}
                          Push to Notion
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleCopy(entry)}>
                          {copiedId === entry.id ? <RiCheckLine className="mr-1.5 w-3 h-3 text-green-400" /> : <RiFileCopyLine className="mr-1.5 w-3 h-3" />}
                          {copiedId === entry.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>

                    {exportStatus && (
                      <StatusMessage message={exportStatus} type="success" />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-6">
                    <LoadingSkeleton rows={4} />
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {querying && conversations.length > 0 && conversations[conversations.length - 1]?.response !== null && (
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <RiSparklingLine className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">InfiniteMind is thinking...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Ask InfiniteMind anything..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="bg-secondary border-border"
              disabled={querying}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="web-toggle" className="text-xs text-muted-foreground whitespace-nowrap">Web Search</Label>
            <Switch id="web-toggle" checked={includeWebSearch} onCheckedChange={setIncludeWebSearch} />
          </div>
          <GoldGlow>
            <Button onClick={handleSubmit} disabled={querying || !queryInput.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all whitespace-nowrap">
              {querying ? (
                <RiSparklingLine className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <RiSearchLine className="mr-2 w-4 h-4" />
              )}
              Ask InfiniteMind
            </Button>
          </GoldGlow>
        </div>
      </div>
    </div>
  )
}

// =============================================
// SCREEN: SETTINGS
// =============================================

function SettingsScreen({
  categories,
  setCategories,
}: {
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const [newCategory, setNewCategory] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [kbDocuments, setKbDocuments] = useState<Array<{ fileName: string; status?: string }>>([])
  const [kbLoading, setKbLoading] = useState(false)
  const [kbStatus, setKbStatus] = useState('')

  const loadDocs = useCallback(async () => {
    setKbLoading(true)
    const result = await getDocuments(RAG_ID)
    if (result.success && Array.isArray(result.documents)) {
      setKbDocuments(result.documents.map((d) => ({ fileName: d.fileName, status: d.status })))
    }
    setKbLoading(false)
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const handleAddCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return
    setCategories((prev) => [...prev, newCategory.trim()])
    setNewCategory('')
  }

  const handleDeleteCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEditStart = (index: number) => {
    setEditingIndex(index)
    setEditValue(categories[index])
  }

  const handleEditSave = () => {
    if (editingIndex === null || !editValue.trim()) return
    setCategories((prev) => prev.map((c, i) => (i === editingIndex ? editValue.trim() : c)))
    setEditingIndex(null)
    setEditValue('')
  }

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= categories.length) return
    setCategories((prev) => {
      const arr = [...prev]
      const temp = arr[index]
      arr[index] = arr[newIndex]
      arr[newIndex] = temp
      return arr
    })
  }

  const handleDeleteKBDoc = async (fileName: string) => {
    const result = await deleteDocuments(RAG_ID, [fileName])
    if (result.success) {
      setKbDocuments((prev) => prev.filter((d) => d.fileName !== fileName))
      setKbStatus(`Deleted ${fileName}`)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-wider mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your knowledge engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
              <RiExternalLinkLine className="w-4 h-4 text-primary" />
              Notion Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400" />
                <span className="text-sm">Connected via Agent</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Notion integration is handled by the Output Delivery Agent. No additional configuration needed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
              <RiDatabase2Line className="w-4 h-4 text-primary" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border">
                <span className="text-sm">Knowledge Base ID</span>
                <Badge variant="outline" className="text-xs font-mono">{RAG_ID}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border">
                <span className="text-sm">Documents</span>
                <span className="text-sm text-primary">{kbDocuments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border">
                <span className="text-sm">Categories</span>
                <span className="text-sm text-primary">{categories.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
            <RiGridLine className="w-4 h-4 text-primary" />
            Category Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Add new category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} className="bg-secondary border-border" />
            <Button variant="outline" onClick={handleAddCategory}><RiAddLine className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="h-[350px]">
            <div className="space-y-1.5 pr-3">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-secondary/50 border border-border group">
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => handleMoveCategory(i, 'up')} disabled={i === 0}>
                      <RiArrowUpLine className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => handleMoveCategory(i, 'down')} disabled={i === categories.length - 1}>
                      <RiArrowDownLine className="w-3 h-3" />
                    </Button>
                  </div>
                  {editingIndex === i ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditSave()} className="bg-secondary border-border h-8 text-sm" autoFocus />
                      <Button variant="outline" size="sm" className="h-8" onClick={handleEditSave}><RiCheckLine className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditingIndex(null)}><RiCloseLine className="w-3.5 h-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{cat}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditStart(i)}>
                          <RiEditLine className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteCategory(i)}>
                          <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
              <RiDatabase2Line className="w-4 h-4 text-primary" />
              Knowledge Base Documents
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadDocs} disabled={kbLoading}>
              <RiRefreshLine className={cn('w-4 h-4', kbLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {kbStatus && <StatusMessage message={kbStatus} type="success" />}
          {kbLoading ? (
            <LoadingSkeleton rows={3} />
          ) : kbDocuments.length === 0 ? (
            <div className="text-center py-8">
              <RiDatabase2Line className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents in the knowledge base</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kbDocuments.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 border border-border group">
                  <div className="flex items-center gap-2">
                    <RiFilePdfLine className="w-4 h-4 text-primary" />
                    <span className="text-sm">{doc.fileName}</span>
                    {doc.status && <Badge variant="secondary" className="text-xs">{doc.status}</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0" onClick={() => handleDeleteKBDoc(doc.fileName)}>
                    <RiDeleteBinLine className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium tracking-wider uppercase flex items-center gap-2">
            <RiInformationLine className="w-4 h-4 text-primary" />
            Agent Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AGENTS_INFO.map((agent) => (
              <div key={agent.id} className="flex items-start gap-3 p-3 bg-secondary/50 border border-border">
                <RiSparklingLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.purpose}</p>
                  <p className="text-xs text-muted-foreground/50 font-mono mt-0.5">{agent.id}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================
// MAIN PAGE
// =============================================

export default function Page() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [categorizedResources, setCategorizedResources] = useState<CategorizedResource[]>([])
  const [conversations, setConversations] = useState<ConversationEntry[]>([])
  const [processing, setProcessing] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info')
  const [exportStatus, setExportStatus] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sampleMode, setSampleMode] = useState(false)
  const [pendingQuery, setPendingQuery] = useState('')

  const navItems = [
    { id: 'dashboard' as ScreenType, label: 'Dashboard', icon: RiDashboardLine },
    { id: 'resources' as ScreenType, label: 'Resource Manager', icon: RiFolderAddLine },
    { id: 'categories' as ScreenType, label: 'Category Browser', icon: RiGridLine },
    { id: 'query' as ScreenType, label: 'Query Console', icon: RiSearchLine },
    { id: 'settings' as ScreenType, label: 'Settings', icon: RiSettings3Line },
  ]

  const handleProcessResources = async (resourceSummary: string) => {
    setProcessing(true)
    setStatusMessage('')
    setActiveAgentId(AGENT_IDS.resourceProcessor)
    try {
      const result = await callAIAgent(
        `Process and categorize these resources:\n${resourceSummary}`,
        AGENT_IDS.resourceProcessor
      )
      if (result.success) {
        const data = result?.response?.result
        if (data && Array.isArray(data?.categorized_resources)) {
          setCategorizedResources(data.categorized_resources)
          setStatusMessage(`Successfully processed ${data?.resources_processed ?? 0} resources`)
          setStatusType('success')
        } else {
          setStatusMessage(data?.message ?? 'Processing complete')
          setStatusType('info')
        }
      } else {
        setStatusMessage(result?.error ?? 'Processing failed')
        setStatusType('error')
      }
    } catch {
      setStatusMessage('An unexpected error occurred')
      setStatusType('error')
    }
    setActiveAgentId(null)
    setProcessing(false)
  }

  const handleQuery = async (query: string, includeWeb: boolean) => {
    setQuerying(true)
    setExportStatus('')
    setActiveAgentId(AGENT_IDS.knowledgeOrchestrator)
    const entryId = generateId()
    const newEntry: ConversationEntry = {
      id: entryId,
      query,
      response: null,
      timestamp: new Date().toISOString(),
    }
    setConversations((prev) => [...prev, newEntry])

    try {
      const webSearchNote = includeWeb ? '\n[Include live web research in your answer]' : ''
      const result = await callAIAgent(
        `${query}${webSearchNote}`,
        AGENT_IDS.knowledgeOrchestrator
      )
      if (result.success) {
        const data = result?.response?.result
        const responseData: QueryResponse = {
          query: data?.query ?? query,
          summary: data?.summary ?? '',
          detailed_analysis: data?.detailed_analysis ?? '',
          comparison_table: Array.isArray(data?.comparison_table) ? data.comparison_table : [],
          sources: Array.isArray(data?.sources) ? data.sources : [],
          recommendation: data?.recommendation ?? '',
          kb_results_used: data?.kb_results_used ?? 0,
          web_results_used: data?.web_results_used ?? 0,
          message: data?.message ?? '',
        }
        setConversations((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, response: responseData } : e))
        )
      } else {
        const errorResponse: QueryResponse = {
          query,
          summary: result?.error ?? 'Failed to get a response. Please try again.',
          detailed_analysis: '',
          comparison_table: [],
          sources: [],
          recommendation: '',
          kb_results_used: 0,
          web_results_used: 0,
          message: result?.error ?? '',
        }
        setConversations((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, response: errorResponse } : e))
        )
      }
    } catch {
      setConversations((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                response: {
                  query,
                  summary: 'An unexpected error occurred.',
                  detailed_analysis: '',
                  comparison_table: [],
                  sources: [],
                  recommendation: '',
                  kb_results_used: 0,
                  web_results_used: 0,
                  message: 'Error',
                },
              }
            : e
        )
      )
    }
    setActiveAgentId(null)
    setQuerying(false)
  }

  const handleExportPDF = async (answerData: QueryResponse) => {
    setExporting(true)
    setExportStatus('')
    setActiveAgentId(AGENT_IDS.outputDelivery)
    try {
      const result = await callAIAgent(
        `Export this content as PDF:\n${JSON.stringify(answerData)}\nDelivery type: pdf`,
        AGENT_IDS.outputDelivery
      )
      if (result.success) {
        const files = result?.module_outputs?.artifact_files
        if (Array.isArray(files) && files.length > 0 && files[0]?.file_url) {
          window.open(files[0].file_url, '_blank')
        }
        const data = result?.response?.result
        setExportStatus(data?.message ?? 'PDF exported successfully')
      } else {
        setExportStatus(result?.error ?? 'Export failed')
      }
    } catch {
      setExportStatus('An unexpected error occurred during export')
    }
    setActiveAgentId(null)
    setExporting(false)
  }

  const handlePushNotion = async (answerData: QueryResponse) => {
    setPushing(true)
    setExportStatus('')
    setActiveAgentId(AGENT_IDS.outputDelivery)
    try {
      const result = await callAIAgent(
        `Push this content to Notion:\n${JSON.stringify(answerData)}\nDelivery type: notion`,
        AGENT_IDS.outputDelivery
      )
      if (result.success) {
        const data = result?.response?.result
        if (data?.notion_page_url) {
          window.open(data.notion_page_url, '_blank')
        }
        setExportStatus(data?.message ?? 'Pushed to Notion successfully')
      } else {
        setExportStatus(result?.error ?? 'Push to Notion failed')
      }
    } catch {
      setExportStatus('An unexpected error occurred')
    }
    setActiveAgentId(null)
    setPushing(false)
  }

  const handleSearchRoute = (query: string) => {
    setPendingQuery(query)
    setActiveScreen('query')
  }

  useEffect(() => {
    if (sampleMode && conversations.length === 0) {
      setConversations(SAMPLE_CONVERSATIONS)
    } else if (!sampleMode && conversations.length > 0) {
      const hasOnlySamples = conversations.every((c) => c.id.startsWith('sample-'))
      if (hasOnlySamples) {
        setConversations([])
      }
    }
  }, [sampleMode, conversations.length])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 border-r border-border bg-[hsl(30,7%,7%)] flex flex-col fixed h-full z-10">
          <div className="p-6 border-b border-border">
            <h1 className="text-lg font-light tracking-[0.2em] text-primary" style={{ textShadow: '0 0 20px rgba(191,155,48,0.3)' }}>
              InfiniteMind
            </h1>
            <p className="text-xs text-muted-foreground tracking-wider mt-0.5">Knowledge Engine</p>
          </div>

          <nav className="flex-1 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-6 py-3 text-sm transition-all border-l-2',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-l-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="tracking-wider">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <AgentActivityIndicator activeAgentId={activeAgentId} />

          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground tracking-wider">Sample Data</Label>
              <Switch id="sample-toggle" checked={sampleMode} onCheckedChange={setSampleMode} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-60">
          <div className="p-8 max-w-6xl mx-auto">
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                categorizedResources={categorizedResources}
                categories={categories}
                onNavigate={setActiveScreen}
                onSearchRoute={handleSearchRoute}
                sampleMode={sampleMode}
              />
            )}

            {activeScreen === 'resources' && (
              <ResourceManagerScreen
                categories={categories}
                onProcess={handleProcessResources}
                processing={processing}
                statusMessage={statusMessage}
                statusType={statusType}
                activeAgentId={activeAgentId}
              />
            )}

            {activeScreen === 'categories' && (
              <CategoryBrowserScreen
                categorizedResources={categorizedResources}
                categories={categories}
                sampleMode={sampleMode}
              />
            )}

            {activeScreen === 'query' && (
              <QueryConsoleScreen
                conversations={conversations}
                setConversations={setConversations}
                onQuery={handleQuery}
                querying={querying}
                onExportPDF={handleExportPDF}
                onPushNotion={handlePushNotion}
                exporting={exporting}
                pushing={pushing}
                exportStatus={exportStatus}
                activeAgentId={activeAgentId}
                initialQuery={pendingQuery}
              />
            )}

            {activeScreen === 'settings' && (
              <SettingsScreen
                categories={categories}
                setCategories={setCategories}
              />
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
