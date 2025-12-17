// src/components/admin/TiktokCsvImporter.tsx

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Clock, Users, Loader2, RefreshCw } from 'lucide-react';
import { TiktokImportResult, ImportBatch } from '@/types';

interface TiktokCsvImporterProps {
  adminId: string;
  onImportComplete?: (result: TiktokImportResult) => void;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

export default function TiktokCsvImporter({ adminId, onImportComplete }: TiktokCsvImporterProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<TiktokImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBatches, setRecentBatches] = useState<ImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [stats, setStats] = useState<{ total: number; available: number; claimed: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent batches and stats on mount
  useEffect(() => {
    fetchRecentBatches();
    fetchStats();
  }, []);

  const fetchRecentBatches = async () => {
    setLoadingBatches(true);
    try {
      const response = await fetch('/api/admin/tiktok-imports?view=batches&limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentBatches(data.batches || []);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/tiktok-imports?view=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('idle');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setImportResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('adminId', adminId);

      const response = await fetch('/api/admin/tiktok-imports', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setImportResult(data);
      setUploadState('success');
      
      // Refresh batches and stats
      fetchRecentBatches();
      fetchStats();
      
      // Callback
      if (onImportComplete) {
        onImportComplete(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setImportResult(null);
    setError(null);
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total Imported</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Available</p>
                <p className="text-2xl font-bold text-white">{stats.available}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Claimed</p>
                <p className="text-2xl font-bold text-white">{stats.claimed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import TikTok Shop Creators
        </h3>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${uploadState === 'dragging' 
              ? 'border-orange-500 bg-orange-500/10' 
              : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
            }
            ${uploadState === 'uploading' ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {uploadState === 'uploading' ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              <p className="text-zinc-300">Processing CSV...</p>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-orange-500" />
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-zinc-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-zinc-500" />
              <div>
                <p className="text-zinc-300">
                  Drag & drop your TikTok Shop CSV here
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  or click to browse
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File Info & Actions */}
        {selectedFile && uploadState !== 'uploading' && !importResult && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Ready to import creators from {selectedFile.name}
            </p>
            <div className="flex gap-2">
              <button
                onClick={resetUpload}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Import Creators
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Import Failed</p>
                <p className="text-sm text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={resetUpload}
              className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success Results */}
        {importResult && (
          <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-400 font-medium">Import Complete</p>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-400">Total Rows</p>
                      <p className="text-white font-semibold">{importResult.totalRows}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Imported</p>
                      <p className="text-green-400 font-semibold">{importResult.imported}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Duplicates</p>
                      <p className="text-yellow-400 font-semibold">{importResult.duplicates}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors List */}
            {importResult.errors.length > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 font-medium">
                      {importResult.errors.length} Issue{importResult.errors.length !== 1 ? 's' : ''} Found
                    </p>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {importResult.errors.slice(0, 20).map((err, index) => (
                        <div key={index} className="text-sm text-yellow-300/80 flex gap-2">
                          {err.row > 0 && (
                            <span className="text-yellow-400/60">Row {err.row}:</span>
                          )}
                          <span>{err.reason}</span>
                        </div>
                      ))}
                      {importResult.errors.length > 20 && (
                        <p className="text-sm text-yellow-400/60 pt-2">
                          ... and {importResult.errors.length - 20} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={resetUpload}
              className="w-full py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
            >
              Import Another File
            </button>
          </div>
        )}
      </div>

      {/* Recent Batches */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Imports
          </h3>
          <button
            onClick={fetchRecentBatches}
            disabled={loadingBatches}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBatches ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingBatches && recentBatches.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : recentBatches.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500">No imports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBatches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-700 rounded-lg">
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{batch.fileName}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(batch.importedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-green-400">{batch.importedCount} imported</p>
                    {batch.duplicateCount > 0 && (
                      <p className="text-xs text-yellow-400">{batch.duplicateCount} duplicates</p>
                    )}
                    {batch.errorCount > 0 && (
                      <p className="text-xs text-red-400">{batch.errorCount} errors</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">CSV Format Requirements</h4>
        <p className="text-sm text-zinc-500 mb-3">
          Upload a TikTok Shop order export CSV. The file should contain these columns:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-zinc-400">Buyer Username</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-zinc-400">Recipient</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-zinc-400">Address Line 1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-zinc-600 rounded-full"></span>
            <span className="text-zinc-500">Address Line 2 (optional)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-zinc-400">City, State, Zipcode</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-zinc-600 rounded-full"></span>
            <span className="text-zinc-500">Variation (Size)</span>
          </div>
        </div>
      </div>
    </div>
  );
}