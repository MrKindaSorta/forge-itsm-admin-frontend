import React, { useState, useEffect } from 'react';
import { Search, Trash2, RotateCcw, Database } from 'lucide-react';
import api from '../lib/api';
import type { Tenant, ProvisioningLog } from '../types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ResponsiveTable } from '../components/ResponsiveTable';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl font-bold text-primary">Tenant Management</h1>
        <Button variant="secondary" size="sm" onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? 'Hide' : 'Show'} Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
            <input
              type="text"
              placeholder="Search subdomain, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-default rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-card text-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-default rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-card text-primary"
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
            className="px-3 py-2 text-sm border border-default rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-card text-primary"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-secondary">Loading...</div>
        ) : (
          <ResponsiveTable
            data={tenants}
            keyExtractor={(tenant) => tenant.id}
            emptyMessage="No tenants found"
            columns={[
              {
                key: 'subdomain',
                label: 'Subdomain',
                render: (tenant) => (
                  <div className="font-medium">{tenant.subdomain}</div>
                ),
              },
              {
                key: 'company',
                label: 'Company',
                render: (tenant) => <div>{tenant.company_name}</div>,
              },
              {
                key: 'email',
                label: 'Email',
                mobileLabel: 'Contact',
                render: (tenant) => <div className="text-secondary">{tenant.admin_email}</div>,
              },
              {
                key: 'plan',
                label: 'Plan',
                render: (tenant) => (
                  <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                    {tenant.plan}
                  </Badge>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (tenant) => (
                  <Badge variant={getStatusBadgeVariant(tenant.status)}>
                    {tenant.status}
                  </Badge>
                ),
              },
              {
                key: 'created',
                label: 'Created',
                mobileLabel: 'Date',
                render: (tenant) => <div className="text-secondary">{formatDate(tenant.created_at)}</div>,
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (tenant) => (
                  <div className="flex space-x-2 justify-end">
                    {tenant.status === 'deleted' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreTenant(tenant.subdomain);
                        }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                        title="Restore"
                      >
                        <RotateCcw size={18} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, tenant, type: 'soft' });
                          }}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                          title="Soft Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, tenant, type: 'hard' });
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Hard Delete"
                        >
                          <Database size={18} />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Provisioning Logs */}
      {showLogs && (
        <div className="bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-base font-semibold text-primary mb-3">Provisioning Logs</h2>
          <ResponsiveTable
            data={logs}
            keyExtractor={(log) => log.id}
            emptyMessage="No logs available"
            columns={[
              {
                key: 'subdomain',
                label: 'Subdomain',
                render: (log) => <div className="font-medium">{log.subdomain}</div>,
              },
              {
                key: 'step',
                label: 'Step',
                render: (log) => <div className="text-secondary">{log.step}</div>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (log) => (
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
                ),
              },
              {
                key: 'message',
                label: 'Message',
                hideOnMobile: true,
                render: (log) => <div className="text-secondary truncate max-w-xs">{log.message || '-'}</div>,
              },
              {
                key: 'time',
                label: 'Time',
                mobileLabel: 'Date',
                render: (log) => <div className="text-secondary text-xs">{formatDate(log.created_at)}</div>,
              },
            ]}
          />
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
          <p className="text-secondary">
            {deleteModal.type === 'soft'
              ? `Are you sure you want to soft delete "${deleteModal.tenant?.subdomain}"? The tenant will be marked as deleted but data will be preserved.`
              : `Are you sure you want to PERMANENTLY delete "${deleteModal.tenant?.subdomain}"? This will remove the database and all files. This action cannot be undone.`}
          </p>

          {deleteModal.type === 'hard' && (
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Type <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{deleteModal.tenant?.subdomain}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-default rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-card text-primary"
                placeholder={deleteModal.tenant?.subdomain}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDeleteModal({ isOpen: false, tenant: null, type: 'soft' });
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
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
