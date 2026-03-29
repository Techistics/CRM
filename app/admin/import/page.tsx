'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

import type { ImportResult } from '@/types/leads'

export default function ImportPage() {
  const { toast } = useToast()
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
        toast({ variant: 'destructive', title: 'Import Failed', description: data.error ?? 'Invalid file data.' })
      } else {
        setResult(data)
        setFile(null)
        toast({ title: 'Import Successful', description: `Imported ${data.importedRows} leads.` })
      }
    } catch {
      setError('Something went wrong. Try again.')
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to server.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#223955]">Import Leads</h1>
        <p className="text-gray-500 text-sm mt-1">
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
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-300 hover:border-blue-400'
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

        <div className="text-5xl mb-4 transition-transform duration-300 hover:scale-110">📂</div>
        <p className="text-[#223955] font-semibold text-lg">
          {file ? file.name : 'Drop your file here or click to browse'}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Supports .csv, .xlsx, .xls
        </p>
      </div>

      {/* Column hint */}
      <div className="mt-8 bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-700 font-medium">
            Recognized columns (any order, any case):
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Name', 'Email', 'Phone / Mobile', 'City', 'Qualification', 'Grades'].map((col) => (
            <span
              key={col}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-medium"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Import button */}
      {file && (
        <button
          onClick={handleImport}
          disabled={loading}
          className="mt-8 w-full bg-[#223955] hover:bg-[#1a2b40] disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing...
            </>
          ) : (
             <>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
               </svg>
               Import "{file.name}"
             </>
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 bg-white border border-emerald-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-700 font-semibold text-lg">Import Complete</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-gray-900 text-2xl font-bold">{result.totalRows}</p>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mt-1">Total Rows</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-emerald-600 text-2xl font-bold">{result.importedRows}</p>
              <p className="text-emerald-700 text-xs font-medium uppercase tracking-wide mt-1">Imported</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
              <p className="text-orange-600 text-2xl font-bold">{result.skippedRows}</p>
              <p className="text-orange-700 text-xs font-medium uppercase tracking-wide mt-1">Skipped</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-8 bg-red-50 border border-red-200 shadow-sm rounded-2xl p-5 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-1.5 bg-red-100 text-red-600 rounded-full shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">Import Failed</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}