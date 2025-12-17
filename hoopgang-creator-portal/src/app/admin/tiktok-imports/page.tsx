// src/app/admin/tiktok-imports/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Users, Search, Filter, Edit2, Trash2, X, Save, AlertTriangle, CheckSquare, Square, MinusSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import TiktokCsvImporter from '@/components/admin/TiktokCsvImporter';
import { TiktokCreatorImport, TiktokImportStatus, Size, ShippingAddress } from '@/types';
import { SIZES } from '@/lib/constants';

// TikTok Logo SVG Component
const TiktokLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
      fill="url(#tiktok-gradient)"
    />
    <defs>
      <linearGradient id="tiktok-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#69C9D0" />
        <stop offset="50%" stopColor="#EE1D52" />
        <stop offset="100%" stopColor="#69C9D0" />
      </linearGradient>
    </defs>
  </svg>
);

type ViewTab = 'import' | 'creators';

const ITEMS_PER_PAGE = 10;

export default function TiktokImportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewTab>('import');
  const [imports, setImports] = useState<TiktokCreatorImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TiktokImportStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImport, setEditingImport] = useState<TiktokCreatorImport | null>(null);
  const [editFormData, setEditFormData] = useState<{
    fullName: string;
    phone: string;
    street: string;
    unit: string;
    city: string;
    state: string;
    zipCode: string;
    productOrdered: string;
    sizeOrdered: Size;
    status: TiktokImportStatus;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation state (single)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingImport, setDeletingImport] = useState<TiktokCreatorImport | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Bulk delete confirmation state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ current: number; total: number } | null>(null);

  // TODO: Get actual admin ID from auth context
  const adminId = 'admin-placeholder';

  useEffect(() => {
    if (activeTab === 'creators') {
      fetchImports();
    }
  }, [activeTab, statusFilter]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, searchQuery]);

  const fetchImports = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      params.set('view', 'imports');
      params.set('limit', '500'); // Fetch more for client-side pagination
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/tiktok-imports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setImports(data.imports || []);
      }
    } catch (err) {
      console.error('Failed to fetch imports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search query
  const filteredImports = useMemo(() => {
    return imports.filter(imp => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        imp.tiktokUsername.toLowerCase().includes(query) ||
        imp.fullName.toLowerCase().includes(query) ||
        imp.shippingAddress.city.toLowerCase().includes(query) ||
        imp.shippingAddress.state.toLowerCase().includes(query)
      );
    });
  }, [imports, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredImports.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedImports = filteredImports.slice(startIndex, endIndex);

  // Get deletable imports (only available and expired, not claimed)
  const deletableSelectedImports = useMemo(() => {
    return filteredImports.filter(
      imp => selectedIds.has(imp.id) && imp.status !== 'claimed'
    );
  }, [filteredImports, selectedIds]);

  // Get all deletable imports in current PAGE (for select all on current page)
  const currentPageDeletableImports = useMemo(() => {
    return paginatedImports.filter(imp => imp.status !== 'claimed');
  }, [paginatedImports]);

  // Selection state helpers (for current page only)
  const isAllOnPageSelected = currentPageDeletableImports.length > 0 && 
    currentPageDeletableImports.every(imp => selectedIds.has(imp.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllOnPageSelected;
  const selectedCount = selectedIds.size;
  const claimedSelectedCount = filteredImports.filter(
    imp => selectedIds.has(imp.id) && imp.status === 'claimed'
  ).length;

  // ===== PAGINATION HANDLERS =====
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Clear selection when changing pages (optional - remove if you want to keep selection across pages)
      // setSelectedIds(new Set());
    }
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // ===== SELECTION HANDLERS =====
  const toggleSelectAllOnPage = () => {
    if (isAllOnPageSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedIds);
      currentPageDeletableImports.forEach(imp => newSelected.delete(imp.id));
      setSelectedIds(newSelected);
    } else {
      // Select all deletable on current page
      const newSelected = new Set(selectedIds);
      currentPageDeletableImports.forEach(imp => newSelected.add(imp.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectOne = (id: string, status: TiktokImportStatus) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (status !== 'claimed') {
        newSelected.add(id);
      }
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getStatusBadge = (status: TiktokImportStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
            Available
          </span>
        );
      case 'claimed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
            Claimed
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full">
            Expired
          </span>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ===== EDIT HANDLERS =====
  const openEditModal = (imp: TiktokCreatorImport) => {
    setEditingImport(imp);
    setEditFormData({
      fullName: imp.fullName,
      phone: imp.phone || '',
      street: imp.shippingAddress.street,
      unit: imp.shippingAddress.unit || '',
      city: imp.shippingAddress.city,
      state: imp.shippingAddress.state,
      zipCode: imp.shippingAddress.zipCode,
      productOrdered: imp.productOrdered,
      sizeOrdered: imp.sizeOrdered,
      status: imp.status,
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingImport(null);
    setEditFormData(null);
    setEditError(null);
  };

  const handleEditSubmit = async () => {
    if (!editingImport || !editFormData) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const shippingAddress: ShippingAddress = {
        street: editFormData.street.trim(),
        city: editFormData.city.trim(),
        state: editFormData.state.trim(),
        zipCode: editFormData.zipCode.trim(),
      };
      if (editFormData.unit.trim()) {
        shippingAddress.unit = editFormData.unit.trim();
      }

      const response = await fetch('/api/admin/tiktok-imports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingImport.id,
          fullName: editFormData.fullName.trim(),
          phone: editFormData.phone.trim() || undefined,
          shippingAddress,
          productOrdered: editFormData.productOrdered.trim(),
          sizeOrdered: editFormData.sizeOrdered,
          status: editFormData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update import');
      }

      // Update local state
      setImports(prev =>
        prev.map(imp => (imp.id === editingImport.id ? data.import : imp))
      );

      closeEditModal();
    } catch (err) {
      console.error('Edit error:', err);
      setEditError(err instanceof Error ? err.message : 'Failed to update import');
    } finally {
      setEditLoading(false);
    }
  };

  // ===== DELETE HANDLERS (SINGLE) =====
  const openDeleteModal = (imp: TiktokCreatorImport) => {
    setDeletingImport(imp);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingImport(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingImport) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/tiktok-imports?id=${deletingImport.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete import');
      }

      // Remove from local state
      setImports(prev => prev.filter(imp => imp.id !== deletingImport.id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingImport.id);
        return newSet;
      });

      closeDeleteModal();
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete import');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ===== BULK DELETE HANDLERS =====
  const openBulkDeleteModal = () => {
    setBulkDeleteError(null);
    setBulkDeleteProgress(null);
    setBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    setBulkDeleteModalOpen(false);
    setBulkDeleteError(null);
    setBulkDeleteProgress(null);
  };

  const handleBulkDeleteConfirm = async () => {
    const toDelete = deletableSelectedImports;
    if (toDelete.length === 0) return;

    setBulkDeleteLoading(true);
    setBulkDeleteError(null);
    setBulkDeleteProgress({ current: 0, total: toDelete.length });

    const failedDeletes: string[] = [];
    const successfulDeletes: string[] = [];

    for (let i = 0; i < toDelete.length; i++) {
      const imp = toDelete[i];
      try {
        const response = await fetch(`/api/admin/tiktok-imports?id=${imp.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          successfulDeletes.push(imp.id);
        } else {
          failedDeletes.push(imp.tiktokUsername);
        }
      } catch {
        failedDeletes.push(imp.tiktokUsername);
      }

      setBulkDeleteProgress({ current: i + 1, total: toDelete.length });
    }

    // Update local state
    setImports(prev => prev.filter(imp => !successfulDeletes.includes(imp.id)));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      successfulDeletes.forEach(id => newSet.delete(id));
      return newSet;
    });

    if (failedDeletes.length > 0) {
      setBulkDeleteError(
        `Failed to delete ${failedDeletes.length} import(s): ${failedDeletes.slice(0, 3).map(u => `@${u}`).join(', ')}${failedDeletes.length > 3 ? '...' : ''}`
      );
    } else {
      closeBulkDeleteModal();
    }

    setBulkDeleteLoading(false);
  };

  const inputClasses =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500';
  const labelClasses = 'block text-zinc-400 text-xs uppercase tracking-wider mb-1';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black border border-zinc-700 rounded-lg">
                <TiktokLogo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TikTok Shop Imports</h1>
                <p className="text-sm text-zinc-400">Import and manage TikTok Shop creators</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import CSV
              </div>
            </button>
            <button
              onClick={() => setActiveTab('creators')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'creators'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Imported Creators
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'import' ? (
          <TiktokCsvImporter
            adminId={adminId}
            onImportComplete={() => {
              // Switch to creators tab and refresh
              setActiveTab('creators');
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by username, name, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TiktokImportStatus | 'all')}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="claimed">Claimed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button
                onClick={fetchImports}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedCount > 0 && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white">
                    <span className="font-medium">{selectedCount}</span> selected
                    {claimedSelectedCount > 0 && (
                      <span className="text-zinc-400 ml-2">
                        ({claimedSelectedCount} claimed - cannot delete)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openBulkDeleteModal}
                    disabled={deletableSelectedImports.length === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      deletableSelectedImports.length === 0
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({deletableSelectedImports.length})
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left w-12">
                      <button
                        onClick={toggleSelectAllOnPage}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        title={isAllOnPageSelected ? 'Deselect all on page' : 'Select all deletable on page'}
                      >
                        {isAllOnPageSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-500" />
                        ) : isSomeSelected ? (
                          <MinusSquare className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-500" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Creator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Product / Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Imported
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedImports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                        {imports.length === 0
                          ? 'No imports yet. Upload a CSV to get started.'
                          : 'No results match your search.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedImports.map((imp) => {
                      const isSelected = selectedIds.has(imp.id);
                      const isClaimed = imp.status === 'claimed';

                      return (
                        <tr
                          key={imp.id}
                          className={`hover:bg-zinc-800/50 transition-colors ${
                            isSelected ? 'bg-orange-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            <button
                              onClick={() => toggleSelectOne(imp.id, imp.status)}
                              disabled={isClaimed}
                              className={`p-1 rounded transition-colors ${
                                isClaimed
                                  ? 'cursor-not-allowed opacity-30'
                                  : 'hover:bg-zinc-700'
                              }`}
                              title={isClaimed ? 'Cannot select claimed imports' : 'Toggle selection'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-orange-500" />
                              ) : (
                                <Square className={`w-5 h-5 ${isClaimed ? 'text-zinc-700' : 'text-zinc-500'}`} />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-black border border-zinc-700 rounded-lg flex items-center justify-center">
                                <TiktokLogo className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white font-medium">@{imp.tiktokUsername}</p>
                                <p className="text-sm text-zinc-400">{imp.fullName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-zinc-300">
                              {imp.shippingAddress.city}, {imp.shippingAddress.state}
                            </p>
                            <p className="text-xs text-zinc-500">{imp.shippingAddress.zipCode}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-zinc-300">{imp.productOrdered}</p>
                            <p className="text-xs text-zinc-500">Size: {imp.sizeOrdered}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-zinc-400 text-sm">
                              {formatDate(imp.importedAt)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(imp.status)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(imp)}
                                className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(imp)}
                                disabled={isClaimed}
                                className={`p-2 rounded-lg transition-colors ${
                                  isClaimed
                                    ? 'text-zinc-600 cursor-not-allowed'
                                    : 'hover:bg-red-500/10 text-zinc-400 hover:text-red-400'
                                }`}
                                title={isClaimed ? 'Cannot delete claimed imports' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Results Count */}
            {!loading && filteredImports.length > 0 && (
              <div className="flex items-center justify-between">
                {/* Results count */}
                <p className="text-sm text-zinc-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredImports.length)} of {filteredImports.length} imported creators
                </p>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* Previous button */}
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'text-zinc-600 cursor-not-allowed'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page, index) => (
                      page === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-zinc-500">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-orange-500 text-white'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}

                    {/* Next button */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'text-zinc-600 cursor-not-allowed'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editModalOpen && editFormData && editingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeEditModal}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black border border-zinc-700 rounded-lg flex items-center justify-center">
                  <TiktokLogo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Import</h3>
                  <p className="text-sm text-zinc-400">@{editingImport.tiktokUsername}</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error */}
            {editError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {editError}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className={labelClasses}>Full Name</label>
                <input
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className={inputClasses}
                />
              </div>

              {/* Phone */}
              <div>
                <label className={labelClasses}>Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className={inputClasses}
                  placeholder="Optional"
                />
              </div>

              {/* Street Address */}
              <div>
                <label className={labelClasses}>Street Address</label>
                <input
                  type="text"
                  value={editFormData.street}
                  onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                  className={inputClasses}
                />
              </div>

              {/* Unit */}
              <div>
                <label className={labelClasses}>Apt/Unit</label>
                <input
                  type="text"
                  value={editFormData.unit}
                  onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                  className={inputClasses}
                  placeholder="Optional"
                />
              </div>

              {/* City, State, ZIP */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClasses}>City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>ZIP</label>
                  <input
                    type="text"
                    value={editFormData.zipCode}
                    onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <label className={labelClasses}>Product Ordered</label>
                <input
                  type="text"
                  value={editFormData.productOrdered}
                  onChange={(e) => setEditFormData({ ...editFormData, productOrdered: e.target.value })}
                  className={inputClasses}
                />
              </div>

              {/* Size */}
              <div>
                <label className={labelClasses}>Size</label>
                <select
                  value={editFormData.sizeOrdered}
                  onChange={(e) => setEditFormData({ ...editFormData, sizeOrdered: e.target.value as Size })}
                  className={inputClasses}
                >
                  {SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className={labelClasses}>Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as TiktokImportStatus })}
                  className={inputClasses}
                >
                  <option value="available">Available</option>
                  <option value="claimed">Claimed</option>
                  <option value="expired">Expired</option>
                </select>
                {editingImport.status === 'claimed' && (
                  <p className="mt-1 text-xs text-orange-400">
                    ⚠️ This import has been claimed. Changing the status may cause issues.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {editLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL (SINGLE) ===== */}
      {deleteModalOpen && deletingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-white text-center mb-2">
              Delete Import?
            </h3>
            <p className="text-zinc-400 text-center text-sm mb-4">
              Are you sure you want to delete the import for{' '}
              <span className="text-white font-medium">@{deletingImport.tiktokUsername}</span>?
              This action cannot be undone.
            </p>

            {/* Import Details */}
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Name:</span>
                <span className="text-white">{deletingImport.fullName}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-zinc-400">Product:</span>
                <span className="text-white">{deletingImport.productOrdered}</span>
              </div>
            </div>

            {/* Error */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {deleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BULK DELETE CONFIRMATION MODAL ===== */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!bulkDeleteLoading ? closeBulkDeleteModal : undefined}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-white text-center mb-2">
              Delete {deletableSelectedImports.length} Import{deletableSelectedImports.length !== 1 ? 's' : ''}?
            </h3>
            <p className="text-zinc-400 text-center text-sm mb-4">
              Are you sure you want to delete {deletableSelectedImports.length} selected import{deletableSelectedImports.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </p>

            {/* Preview of items to delete */}
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <div className="text-xs text-zinc-400 mb-2">Items to delete:</div>
              <div className="space-y-1">
                {deletableSelectedImports.slice(0, 5).map(imp => (
                  <div key={imp.id} className="text-sm text-white flex items-center gap-2">
                    <span>@{imp.tiktokUsername}</span>
                    <span className="text-zinc-500">-</span>
                    <span className="text-zinc-400">{imp.fullName}</span>
                  </div>
                ))}
                {deletableSelectedImports.length > 5 && (
                  <div className="text-sm text-zinc-500">
                    ...and {deletableSelectedImports.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            {bulkDeleteProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">Progress</span>
                  <span className="text-white">
                    {bulkDeleteProgress.current} / {bulkDeleteProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-200"
                    style={{
                      width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {bulkDeleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {bulkDeleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleteLoading}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {bulkDeleteError ? 'Close' : 'Cancel'}
              </button>
              {!bulkDeleteError && (
                <button
                  onClick={handleBulkDeleteConfirm}
                  disabled={bulkDeleteLoading}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bulkDeleteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}