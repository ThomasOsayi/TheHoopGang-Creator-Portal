// src/app/admin/tiktok-imports/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Users, Search, Filter } from 'lucide-react';
import TiktokCsvImporter from '@/components/admin/TiktokCsvImporter';
import { TiktokCreatorImport, TiktokImportStatus } from '@/types';

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

export default function TiktokImportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewTab>('import');
  const [imports, setImports] = useState<TiktokCreatorImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TiktokImportStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Get actual admin ID from auth context
  const adminId = 'admin-placeholder';

  useEffect(() => {
    if (activeTab === 'creators') {
      fetchImports();
    }
  }, [activeTab, statusFilter]);

  const fetchImports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('view', 'imports');
      params.set('limit', '50');
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

  const filteredImports = imports.filter(imp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      imp.tiktokUsername.toLowerCase().includes(query) ||
      imp.fullName.toLowerCase().includes(query) ||
      imp.shippingAddress.city.toLowerCase().includes(query)
    );
  });

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
              // Could show a toast or navigate
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
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredImports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                        {imports.length === 0
                          ? 'No imports yet. Upload a CSV to get started.'
                          : 'No results match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredImports.map((imp) => (
                      <tr key={imp.id} className="hover:bg-zinc-800/50 transition-colors">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            {!loading && filteredImports.length > 0 && (
              <p className="text-sm text-zinc-500">
                Showing {filteredImports.length} of {imports.length} imported creators
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}