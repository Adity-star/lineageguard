'use client'

import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { cn } from '@/lib/utils'

interface MonacoDiffProps {
  original: string
  modified: string
  language?: string
  className?: string
  height?: string
}

export function MonacoDiff({ original, modified, language = 'sql', className, height = '400px' }: MonacoDiffProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border border-border/50', className)}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  )
}

interface MonacoEditorProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
  height?: string
}

export function MonacoEditor({ 
  value, 
  language = 'sql', 
  onChange, 
  readOnly = false,
  className,
  height = '400px'
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value)
    }
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border border-border/50', className)}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        theme="vs-dark"
        onChange={handleEditorChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  )
}
