import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Eye } from 'lucide-react';
import api from '../lib/api';
import type { ContactSubmission } from '../types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { formatDate, formatRelativeTime } from '../lib/utils';

export const ContactPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [viewModal, setViewModal] = useState(false);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [statusFilter]);

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/api/admin/contacts?${params.toString()}`);
      setContacts(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      setIsLoading(false);
    }
  };

  const handleViewContact = async (contact: ContactSubmission) => {
    setSelectedContact(contact);
    setViewModal(true);

    // Mark as read if it's new
    if (contact.status === 'new') {
      try {
        await api.put(`/api/admin/contacts/${contact.id}/mark-read`);
        // Update local state
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: 'read' } : c))
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Are you sure you want to delete this contact submission?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setViewModal(false);
      setSelectedContact(null);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'read':
        return 'gray';
      case 'archived':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const unreadCount = contacts.filter((c) => c.status === 'new').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-primary">Contact Submissions</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-secondary mt-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{unreadCount}</span> unread message
              {unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm p-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-default rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-card text-primary"
        >
          <option value="all">All Messages</option>
          <option value="new">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Contact List */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-secondary">Loading...</div>
        ) : (
          <ResponsiveTable
            data={contacts}
            keyExtractor={(contact) => contact.id}
            onRowClick={(contact) => handleViewContact(contact)}
            emptyMessage="No contact submissions found"
            columns={[
              {
                key: 'status',
                label: 'Status',
                render: (contact) => (
                  <Badge variant={getStatusBadgeVariant(contact.status)}>
                    {contact.status === 'new' && <Mail size={12} className="mr-1 inline" />}
                    {contact.status}
                  </Badge>
                ),
              },
              {
                key: 'name',
                label: 'Name',
                render: (contact) => (
                  <div className={contact.status === 'new' ? 'font-bold' : 'font-medium'}>
                    {contact.name}
                  </div>
                ),
              },
              {
                key: 'email',
                label: 'Email',
                render: (contact) => <div className="text-secondary">{contact.email}</div>,
              },
              {
                key: 'company',
                label: 'Company',
                hideOnMobile: true,
                render: (contact) => <div className="text-secondary">{contact.company || '-'}</div>,
              },
              {
                key: 'message',
                label: 'Message Preview',
                mobileLabel: 'Preview',
                render: (contact) => (
                  <div className="text-secondary truncate max-w-xs">
                    {contact.message.substring(0, 60)}
                    {contact.message.length > 60 ? '...' : ''}
                  </div>
                ),
              },
              {
                key: 'received',
                label: 'Received',
                mobileLabel: 'Time',
                render: (contact) => <div className="text-secondary text-xs">{formatRelativeTime(contact.created_at)}</div>,
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (contact) => (
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewContact(contact);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title="View"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(contact.id);
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* View Contact Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedContact(null);
        }}
        title="Contact Submission"
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Name</label>
                <p className="text-primary">{selectedContact.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedContact.email}
                </a>
              </div>
            </div>

            {selectedContact.company && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Company</label>
                <p className="text-primary">{selectedContact.company}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Message</label>
              <div className="bg-elevated p-3 rounded-lg">
                <p className="text-primary whitespace-pre-wrap text-sm">{selectedContact.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary">
              <div>
                <label className="block font-medium">Received</label>
                <p>{formatDate(selectedContact.created_at)}</p>
              </div>
              {selectedContact.read_at && (
                <div>
                  <label className="block font-medium">Read</label>
                  <p>{formatDate(selectedContact.read_at)}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-3 border-t border-default">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteContact(selectedContact.id)}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setViewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
