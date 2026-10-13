'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Search,
  Filter,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  productService,
  type BulkValidationResult,
  type BulkSubmitResult,
  type BulkBatchDetail,
  type BulkRowResult,
} from '@/features/products/services/product-service'
import { ApiError } from '@/lib/api/errors'

const STEPS = [
  { id: 1, title: 'Download Template', desc: 'Get CSV or Excel schema' },
  { id: 2, title: 'Upload Image ZIP', desc: 'SKU-named photo archive' },
  { id: 3, title: 'Upload Spreadsheet', desc: 'CSV or XLSX product data' },
  { id: 4, title: 'Validate & Preview', desc: 'Verify rows and images' },
  { id: 5, title: 'Correct Errors', desc: 'Review row validation' },
  { id: 6, title: 'Submit Products', desc: 'Send valid to Admin review' },
  { id: 7, title: 'Results & History', desc: 'Batch status and logs' },
]

export function BulkUploadPage() {
  const router = useRouter()

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null)

  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState<'csv' | 'xlsx' | null>(null)

  const [validationResult, setValidationResult] = useState<BulkValidationResult | null>(null)
  const [submissionResult, setSubmissionResult] = useState<BulkSubmitResult | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  // Filters for preview
  const [rowFilter, setRowFilter] = useState<'all' | 'valid' | 'invalid'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Batch History
  const [batches, setBatches] = useState<BulkBatchDetail[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard')

  // Refs for drag and drop
  const zipInputRef = useRef<HTMLInputElement>(null)
  const spreadsheetInputRef = useRef<HTMLInputElement>(null)
  const [zipDragOver, setZipDragOver] = useState(false)
  const [sheetDragOver, setSheetDragOver] = useState(false)

  // Load batch history
  const loadBatchHistory = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const res = await productService.bulk.listBatches()
      setBatches(res.items || [])
    } catch {
      // Non-blocking history load
    } finally {
      setLoadingBatches(false)
    }
  }, [])

  useEffect(() => {
    loadBatchHistory()
  }, [loadBatchHistory])

  // Download template
  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    setDownloadingTemplate(format)
    setGeneralError(null)
    try {
      await productService.bulk.downloadTemplate(format)
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to download template. Please try again.')
    } finally {
      setDownloadingTemplate(null)
    }
  }

  // Handle ZIP selection
  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setZipDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
      setZipFile(file)
      setGeneralError(null)
    } else {
      setGeneralError('Please upload a valid .zip archive')
    }
  }

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setZipFile(file)
      setGeneralError(null)
    }
  }

  // Handle Spreadsheet selection
  const handleSpreadsheetDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setSheetDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSpreadsheetFile(file)
      setGeneralError(null)
    } else {
      setGeneralError('Please upload a CSV or XLSX spreadsheet')
    }
  }

  const handleSpreadsheetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSpreadsheetFile(file)
      setGeneralError(null)
    }
  }

  // Validate Batch
  const handleValidate = async () => {
    if (!spreadsheetFile) {
      setGeneralError('Please upload a spreadsheet file to validate.')
      return
    }

    setValidating(true)
    setGeneralError(null)

    const formData = new FormData()
    formData.append('spreadsheet', spreadsheetFile)
    if (zipFile) {
      formData.append('zip', zipFile)
    }

    try {
      const result = await productService.bulk.validate(formData)
      setValidationResult(result)
      if (result.invalidRowsCount > 0) {
        setCurrentStep(5) // Review errors
      } else {
        setCurrentStep(4) // Ready for review / submit
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Validation failed. Please verify your file contents.')
    } finally {
      setValidating(false)
    }
  }

  // Submit Valid Products
  const handleSubmitValid = async () => {
    if (!validationResult) return

    setSubmitting(true)
    setGeneralError(null)
    try {
      const result = await productService.bulk.submit(validationResult.batchId)
      setSubmissionResult(result)
      setConfirmModalOpen(false)
      setCurrentStep(7) // Results view
      loadBatchHistory()
    } catch (err: any) {
      setGeneralError(err?.message || 'Product submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Download error report
  const handleDownloadErrorReport = async (batchId: string) => {
    try {
      await productService.bulk.downloadErrorReport(batchId)
    } catch (err: any) {
      setGeneralError(err?.message || 'Could not download error report.')
    }
  }

  // Filter rows
  const filteredRows = (validationResult?.rows || []).filter((row) => {
    if (rowFilter === 'valid' && !row.isValid) return false
    if (rowFilter === 'invalid' && row.isValid) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchSku = row.sku?.toLowerCase().includes(q)
      const matchName = row.name?.toLowerCase().includes(q)
      const matchCategory = row.category?.toLowerCase().includes(q)
      return matchSku || matchName || matchCategory
    }
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog Management"
        title="Bulk Product Upload"
        description="Upload spreadsheets and ZIP photo archives to list multiple products with automated SKU matching and admin approval."
        action={
          <div className="flex items-center gap-3">
            <button
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                activeTab === 'wizard'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('wizard')}
            >
              Upload Wizard
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => {
                setActiveTab('history')
                loadBatchHistory()
              }}
            >
              <Clock className="w-3.5 h-3.5" /> Batch History ({batches.length})
            </button>
            <button
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={() => router.push('/products')}
            >
              Back to Catalog
            </button>
          </div>
        }
      />

      {generalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{generalError}</div>
          <button
            onClick={() => setGeneralError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'history' ? (
        /* Batch History Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Upload History & Batch Status</h3>
              <p className="text-xs text-slate-500">Track all bulk uploads, row validation statuses, and review submissions</p>
            </div>
            <button
              onClick={loadBatchHistory}
              disabled={loadingBatches}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBatches ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No bulk upload batches recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Use the upload wizard to submit your first bulk spreadsheet</p>
              <button
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                onClick={() => setActiveTab('wizard')}
              >
                Start New Bulk Upload
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Total Rows</th>
                    <th className="py-3 px-4">Valid / Invalid</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-900 font-medium">
                        {b.batchId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {b.originalSpreadsheetName}
                        {b.originalZipName && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            + {b.originalZipName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{b.totalRows}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-emerald-700 font-semibold">{b.validRowsCount} valid</span>
                        {b.invalidRowsCount > 0 && (
                          <span className="text-rose-600 font-semibold ml-2">/ {b.invalidRowsCount} invalid</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900">{b.submittedCount}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'PARTIALLY_COMPLETED'
                              ? 'bg-amber-100 text-amber-800'
                              : b.status === 'SUBMITTING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {b.invalidRowsCount > 0 && (
                          <button
                            onClick={() => handleDownloadErrorReport(b.batchId)}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold transition"
                          >
                            <Download className="w-3.5 h-3.5" /> Error Report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Wizard Tab */
        <div className="space-y-6">
          {/* Progress Stepper */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px] gap-2">
              {STEPS.map((step) => {
                const isCurrent = currentStep === step.id
                const isCompleted = currentStep > step.id
                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      if (isCompleted || step.id <= 3) setCurrentStep(step.id)
                    }}
                    className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-50/80 border border-amber-200'
                        : isCompleted
                        ? 'opacity-85 hover:bg-slate-50'
                        : 'opacity-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-600 text-white ring-4 ring-amber-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{step.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{step.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 1: Download Template */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold tracking-wide uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                  Step 1
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Download Standard Spreadsheet Template</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configured with Bengal handicraft categories, GI authenticity fields, and SKU sample data.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadTemplate('xlsx')}
                  disabled={Boolean(downloadingTemplate)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  {downloadingTemplate === 'xlsx' ? 'Generating...' : 'Excel Template (.xlsx)'}
                </button>
                <button
                  onClick={() => handleDownloadTemplate('csv')}
                  disabled={Boolean(downloadingTemplate)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  {downloadingTemplate === 'csv' ? 'Generating...' : 'CSV Template (.csv)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Mandatory Columns:</span>
                Product Name, SKU, Category, Price, Stock Quantity, and Primary Image (via ZIP matching).
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Authenticity & GI Tagging:</span>
                Provide your registered GI Tag or Artisan Guild certificate number in the Authenticity Reference column.
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block mb-1">Image Naming Rule:</span>
                Name photos using product SKU: <code>&lt;SKU&gt;_1.jpg</code> (Primary), <code>&lt;SKU&gt;_2.jpg</code> (Additional).
              </div>
            </div>
          </div>

          {/* Steps 2 & 3: File Uploads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 2: ZIP Upload */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-wide uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Step 2
                  </span>
                  <span className="text-xs text-slate-400">Max 50MB (JPG, PNG, WEBP, GIF, BMP)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Upload Product Images (.zip)</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Compress your product photos into a ZIP archive. File names matching product SKUs will be automatically linked.
                </p>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setZipDragOver(true)
                  }}
                  onDragLeave={() => setZipDragOver(false)}
                  onDrop={handleZipDrop}
                  onClick={() => zipInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[170px] ${
                    zipDragOver
                      ? 'border-amber-500 bg-amber-50/50'
                      : zipFile
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleZipSelect}
                    className="hidden"
                  />
                  {zipFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">{zipFile.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {(zipFile.size / 1024 / 1024).toFixed(2)} MB • Ready for matching
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setZipFile(null)
                        }}
                        className="text-xs text-rose-600 hover:underline mt-1 font-semibold"
                      >
                        Remove & Replace
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        Drag and drop your images ZIP archive here
                      </div>
                      <div className="text-[11px] text-slate-400">or click to browse from your computer</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                <span className="font-bold block mb-0.5">Filename Convention:</span>
                <code>RUP-TERR-001_1.jpg</code> (Primary Image), <code>RUP-TERR-001_2.jpg</code> (Additional View)
              </div>
            </div>

            {/* Step 3: Spreadsheet Upload */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-wide uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Step 3
                  </span>
                  <span className="text-xs text-slate-400">CSV or XLSX (Max 10MB)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Upload Products Spreadsheet</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Select your populated product list. Each row represents a single SKU with inventory and pricing.
                </p>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setSheetDragOver(true)
                  }}
                  onDragLeave={() => setSheetDragOver(false)}
                  onDrop={handleSpreadsheetDrop}
                  onClick={() => spreadsheetInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[170px] ${
                    sheetDragOver
                      ? 'border-amber-500 bg-amber-50/50'
                      : spreadsheetFile
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={spreadsheetInputRef}
                    type="file"
                    accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={handleSpreadsheetSelect}
                    className="hidden"
                  />
                  {spreadsheetFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">{spreadsheetFile.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {(spreadsheetFile.size / 1024).toFixed(1)} KB • Ready for processing
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSpreadsheetFile(null)
                        }}
                        className="text-xs text-rose-600 hover:underline mt-1 font-semibold"
                      >
                        Remove & Replace
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        Drag and drop your CSV or XLSX spreadsheet here
                      </div>
                      <div className="text-[11px] text-slate-400">or click to browse from your computer</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {spreadsheetFile ? 'Files ready for validation' : 'Upload both files to proceed to Step 4'}
                </span>
                <button
                  onClick={handleValidate}
                  disabled={!spreadsheetFile || validating}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
                >
                  {validating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Validating Files...
                    </>
                  ) : (
                    <>
                      Validate & Preview <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Steps 4, 5 & 6: Validation Preview & Results */}
          {validationResult && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Metrics Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold tracking-wide uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                      Step 4 & 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">Validation Results & Product Preview</h3>
                    <p className="text-xs text-slate-500">
                      Batch ID: <span className="font-mono text-slate-700 font-semibold">{validationResult.batchId}</span>
                    </p>
                  </div>

                  {/* Submission CTA */}
                  <div className="flex items-center gap-3">
                    {validationResult.invalidRowsCount > 0 && (
                      <button
                        onClick={() => handleDownloadErrorReport(validationResult.batchId)}
                        className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Download className="w-4 h-4" /> Download Error Report
                      </button>
                    )}
                    {validationResult.validRowsCount > 0 && (
                      <button
                        onClick={() => setConfirmModalOpen(true)}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
                      >
                        <ShieldCheck className="w-4 h-4" /> Submit {validationResult.validRowsCount} Valid Products for Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-xs text-slate-500 font-medium">Total Rows Parsed</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">{validationResult.totalRows}</div>
                  </div>
                  <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="text-xs text-emerald-800 font-medium">Valid & Ready to Submit</div>
                    <div className="text-2xl font-black text-emerald-700 mt-0.5">
                      {validationResult.validRowsCount}
                    </div>
                  </div>
                  <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
                    <div className="text-xs text-rose-800 font-medium">Rows with Errors</div>
                    <div className="text-2xl font-black text-rose-700 mt-0.5">
                      {validationResult.invalidRowsCount}
                    </div>
                  </div>
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
                    <div className="text-xs text-blue-800 font-medium">Image Match Coverage</div>
                    <div className="text-2xl font-black text-blue-700 mt-0.5">
                      {validationResult.totalRows > 0
                        ? `${Math.round(
                            (validationResult.rows.filter((r) => r.matchedImages.length > 0).length /
                              validationResult.totalRows) *
                              100,
                          )}%`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {/* ZIP Extraction Notices if any */}
                {validationResult.extractionErrors?.length > 0 && (
                  <div className="mt-4 p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-700">
                      <AlertTriangle className="w-4 h-4" /> ZIP Extraction Warnings ({validationResult.extractionErrors.length})
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {validationResult.extractionErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          <span className="font-mono">{err.filename}:</span> {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Toolbar & Filter Tabs */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRowFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      rowFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Rows ({validationResult.totalRows})
                  </button>
                  <button
                    onClick={() => setRowFilter('valid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      rowFilter === 'valid'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    Valid Only ({validationResult.validRowsCount})
                  </button>
                  <button
                    onClick={() => setRowFilter('invalid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      rowFilter === 'invalid'
                        ? 'bg-rose-700 text-white'
                        : 'bg-white text-rose-700 border border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    Errors ({validationResult.invalidRowsCount})
                  </button>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by SKU or Product Name..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              {/* Table of Rows */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Row #</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3">Matched Images</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50/70 transition ${
                            !row.isValid ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-600">
                            {row.rowNumber}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                            {row.sku || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800 max-w-[200px] truncate">
                            {row.name || <span className="text-rose-500 italic">Missing name</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{row.category}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {row.price > 0 ? `₹${row.price}` : <span className="text-rose-600">₹0</span>}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900">{row.stock}</td>
                          <td className="py-3 px-3">
                            {row.matchedImages.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                                {row.matchedImages.map((img, i) => (
                                  <span
                                    key={i}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                      img.isPrimary
                                        ? 'bg-blue-100 text-blue-800 font-bold border border-blue-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                    title={img.filename}
                                  >
                                    {img.isPrimary ? '★ ' : ''}
                                    {img.filename.length > 14
                                      ? `${img.filename.slice(0, 12)}..`
                                      : img.filename}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-rose-600 font-medium text-[11px] flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> No images
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.isValid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.isValid ? 'VALID' : 'INVALID'}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-[260px]">
                            {row.errors.length > 0 ? (
                              <div className="space-y-1">
                                {row.errors.map((err, i) => (
                                  <div
                                    key={i}
                                    className="text-[11px] text-rose-700 bg-rose-100/60 px-1.5 py-0.5 rounded leading-tight"
                                  >
                                    <strong className="capitalize">{err.field}:</strong> {err.message}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> All checks passed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 7: Submission Result Card */}
          {submissionResult && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold tracking-wide uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Submission Complete
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {submissionResult.newlySubmitted} Products Submitted for Admin Review
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Your products have been securely placed in <strong>SUBMITTED</strong> status and forwarded to Rupakar catalog admins.
                    Inventory levels and product images were linked successfully.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-slate-500 font-medium">Batch ID</div>
                      <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                        {submissionResult.batchId}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-slate-500 font-medium">Submitted Today</div>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">
                        {submissionResult.newlySubmitted}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-slate-500 font-medium">Batch Status</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {submissionResult.status}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-slate-500 font-medium">Review Stage</div>
                      <div className="text-xs font-bold text-amber-700 mt-0.5">Under Admin Review</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/products')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                    >
                      View All Products in Catalog
                    </button>
                    <button
                      onClick={() => {
                        setValidationResult(null)
                        setSubmissionResult(null)
                        setSpreadsheetFile(null)
                        setZipFile(null)
                        setCurrentStep(1)
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Upload Another Batch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal for Partial Submission */}
          {confirmModalOpen && validationResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Confirm Product Submission</h4>
                <p className="text-xs text-slate-500 mt-1.5">
                  You are about to submit <strong>{validationResult.validRowsCount} valid products</strong> for marketplace review.
                </p>

                {validationResult.invalidRowsCount > 0 && (
                  <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold block mb-1">Partial Success Policy:</span>
                    {validationResult.invalidRowsCount} invalid products will <strong>not</strong> be created.
                    You can download the error report, correct those rows, and re-upload them at any time.
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setConfirmModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitValid}
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      'Yes, Submit Valid Products'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
