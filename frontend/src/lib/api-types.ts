export type User = { id: string; email: string; plan: "free" | "starter" | "pro" };
export type LoginResponse = { token: string; user: User };
export type RegisterResponse = {
  token: string;
  user: User;
  api_key: { raw_key: string; prefix: string; name: string; note: string };
};

export type Template = {
  id: string;
  name: string;
  description: string | null;
  is_official: boolean;
  live_version: TemplateVersion | null;
  created_at: number;
  updated_at: number;
};

export type TemplateVersion = {
  id: string;
  version_number: number;
  source: string;
  files: Record<string, string> | null;
  defaults: Record<string, unknown> | null;
  commit_message: string | null;
  created_at: number;
};

export type TemplateVersionSummary = Omit<
  TemplateVersion,
  "source" | "files" | "defaults"
>;

export type TemplateDetail = Template & {
  live_version: TemplateVersion | null;
  versions: TemplateVersionSummary[];
};

export type Asset = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
  created_at: number;
};

export type UsageResponse = {
  plan: string;
  renders: { used: number; limit: number; remaining: number };
  period: { start: string; end: string };
};

export type ApiKey = {
  id: string;
  prefix: string;
  name: string;
  last_used_at: number | null;
  created_at: number;
};

export type AiEditResponse = {
  code: string;
  tokens_used: number;
};

export type ApiError = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
};
