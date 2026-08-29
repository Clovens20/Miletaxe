import type { LocalizedString } from '@/types/domain';

export type SupportStatus = 'open' | 'claimed' | 'escalated' | 'resolved';
export type SupportAuthorRole = 'user' | 'agent' | 'admin';

export type SupportTopic = {
  id: string;
  code: string;
  category: string;
  title_i18n: LocalizedString;
  body_i18n: LocalizedString;
  sort_order: number;
  is_active: boolean;
};

export type SupportInboxRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  status: SupportStatus;
  assigned_agent_id: string | null;
  topic_id: string | null;
  last_message_at: string;
  created_at: string;
};

export type SupportThread = {
  id: string;
  user_id: string;
  status: SupportStatus;
  assigned_agent_id: string | null;
  topic_id: string | null;
  last_message_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  author_id: string;
  author_role: SupportAuthorRole;
  body: string;
  created_at: string;
};

export type SupportAgentRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};
