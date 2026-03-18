'use client'

import { useState, useRef } from 'react'

type ImportResult = {
  success: boolean
  totalRows: number
  importedRows: number
  skippedRows: number
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Import failed')
      } else {
        setResult(data)
        setFile(null)
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Import Leads</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload a CSV or Excel file to bulk-import student leads
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        <div className="text-4xl mb-3">📂</div>
        <p className="text-white font-medium">
          {file ? file.name : 'Drop your file here or click to browse'}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Supports .csv, .xlsx, .xls
        </p>
      </div>

      {/* Column hint */}
      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs font-medium mb-2">
          Recognized columns (any order, any case):
        </p>
        <div className="flex flex-wrap gap-2">
          {['Name', 'Email', 'Phone / Mobile', 'City', 'Qualification', 'Grades'].map((col) => (
            <span
              key={col}
              className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-md"
            >
              {col}
            </span>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-2">
          All other columns are saved automatically in raw data
        </p>
      </div>

      {/* Import button */}
      {file && (
        <button
          onClick={handleImport}
          disabled={loading}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Importing...' : `Import "${file.name}"`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-gray-900 border border-emerald-800 rounded-xl p-6">
          <p className="text-emerald-400 font-medium mb-3">✓ Import complete</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total rows in file</span>
              <span className="text-white">{result.totalRows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Leads imported</span>
              <span className="text-emerald-400 font-medium">{result.importedRows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Skipped (empty rows)</span>
              <span className="text-gray-500">{result.skippedRows}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-950 border border-red-800 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}