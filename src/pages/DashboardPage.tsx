import React, { useState, useEffect } from 'react';
import { Search, Trash2, RotateCcw, Database } from 'lucide-react';
import api from '../lib/api';
import type { Tenant, ProvisioningLog } from '../types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { formatDate } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<ProvisioningLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showLogs, setShowLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; tenant: Tenant | null; type: 'soft' | 'hard' }>({
    isOpen: false,
    tenant: null,
    type: 'soft',
  });
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    fetchTenants();
    const interval = setInterval(fetchTenants, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTenants = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan', planFilter);

      const response = await api.get(`/api/admin/tenants?${params.toString()}`);
      setTenants(response.data.tenants || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/api/admin/provision-logs');
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  useEffect(() => {
    if (showLogs) {
      fetchLogs();
    }
  }, [showLogs]);

  useEffect(() => {
    fetchTenants();
  }, [searchQuery, statusFilter, planFilter]);

  const handleDeleteTenant = async () => {
    if (!deleteModal.tenant) return;

    if (deleteModal.type === 'hard' && confirmText !== deleteModal.tenant.subdomain) {
      alert('Please type the subdomain correctly to confirm');
      return;
    }

    try {
      if (deleteModal.type === 'soft') {
        await api.post(`/api/admin/tenants/${deleteModal.tenant.subdomain}/soft-delete`);
      } else {
        await api.delete(`/api/admin/tenants/${deleteModal.tenant.subdomain}`);
      }
      setDeleteModal({ isOpen: false, tenant: null, type: 'soft' });
      setConfirmText('');
      fetchTenants();
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      alert('Failed to delete tenant');
    }
  };

  const handleRestoreTenant = async (subdomain: string) => {
    try {
      await api.post(`/api/admin/tenants/${subdomain}/restore`);
      fetchTenants();
    } catch (error) {
      console.error('Failed to restore tenant:', error);
      alert('Failed to restore tenant');
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'blue';
      case 'professional':
        return 'purple';
      case 'business':
        return 'pink';
      default:
        return 'gray';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'suspended':
        return 'yellow';
      case 'deleted':
        return 'red';
      case 'provisioning':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
        <Button variant="secondary" onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? 'Hide' : 'Show'} Provisioning Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by subdomain, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="provisioning">Provisioning</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subdomain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No tenants found
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tenant.subdomain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tenant.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{tenant.admin_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                      {tenant.plan}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tenant.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {tenant.status === 'deleted' ? (
                        <button
                          onClick={() => handleRestoreTenant(tenant.subdomain)}
                          className="text-green-600 hover:text-green-900"
                          title="Restore"
                        >
                          <RotateCcw size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, tenant, type: 'soft' })}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Soft Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, tenant, type: 'hard' })}
                            className="text-red-600 hover:text-red-900"
                            title="Hard Delete"
                          >
                            <Database size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Provisioning Logs */}
      {showLogs && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Provisioning Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subdomain</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Step</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className={log.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">{log.subdomain}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{log.step}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={
                          log.status === 'success'
                            ? 'green'
                            : log.status === 'error'
                            ? 'red'
                            : 'yellow'
                        }
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{log.message || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          setDeleteModal({ isOpen: false, tenant: null, type: 'soft' });
          setConfirmText('');
        }}
        title={deleteModal.type === 'soft' ? 'Soft Delete Tenant' : 'Hard Delete Tenant'}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {deleteModal.type === 'soft'
              ? `Are you sure you want to soft delete "${deleteModal.tenant?.subdomain}"? The tenant will be marked as deleted but data will be preserved.`
              : `Are you sure you want to PERMANENTLY delete "${deleteModal.tenant?.subdomain}"? This will remove the database and all files. This action cannot be undone.`}
          </p>

          {deleteModal.type === 'hard' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="font-mono bg-gray-100 px-1">{deleteModal.tenant?.subdomain}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder={deleteModal.tenant?.subdomain}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModal({ isOpen: false, tenant: null, type: 'soft' });
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTenant}
              disabled={deleteModal.type === 'hard' && confirmText !== deleteModal.tenant?.subdomain}
            >
              {deleteModal.type === 'soft' ? 'Soft Delete' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
