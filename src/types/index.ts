export interface AdminUser {
  id: number;
  email: string;
  name: string;
  created_at: string;
  last_login?: string;
}

export interface Tenant {
  id: number;
  subdomain: string;
  company_name: string;
  admin_email: string;
  plan: 'starter' | 'professional' | 'business';
  status: 'active' | 'suspended' | 'deleted' | 'provisioning';
  database_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProvisioningLog {
  id: number;
  subdomain: string;
  step: string;
  status: 'in_progress' | 'success' | 'error';
  message?: string;
  created_at: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  admin: AdminUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  company?: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  ip_address?: string;
  created_at: string;
  read_at?: string;
}
