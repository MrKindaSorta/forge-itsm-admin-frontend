import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Eye } from 'lucide-react';
import api from '../lib/api';
import type { ContactSubmission } from '../types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Submissions</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold text-blue-600">{unreadCount}</span> unread message
              {unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        >
          <option value="all">All Messages</option>
          <option value="new">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Contact List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received
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
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No contact submissions found
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    contact.status === 'new' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleViewContact(contact)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusBadgeVariant(contact.status)}>
                      {contact.status === 'new' && <Mail size={12} className="mr-1 inline" />}
                      {contact.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${contact.status === 'new' ? 'font-bold' : 'font-medium'} text-gray-900`}>
                      {contact.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{contact.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contact.company || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 truncate max-w-md">
                      {contact.message.substring(0, 80)}
                      {contact.message.length > 80 ? '...' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRelativeTime(contact.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContact(contact);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{selectedContact.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {selectedContact.email}
                </a>
              </div>
            </div>

            {selectedContact.company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <p className="text-gray-900">{selectedContact.company}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedContact.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
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

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="danger"
                onClick={() => handleDeleteContact(selectedContact.id)}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setViewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
