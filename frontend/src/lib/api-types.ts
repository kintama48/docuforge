import type { LowCodeSpec } from "@/src/lib/low-code";

export type User = {
  id: string;
  email: string;
  plan: "free" | "dev" | "starter" | "pro";
};
export type ApiKeyReveal = {
  raw_key: string;
  prefix: string;
  name: string;
  note: string;
};

export type LoginResponse = { token: string; user: User };

export type OtpChallenge = {
  challenge_id: string;
  expires_in_ms: number;
  resend_after_ms: number;
};

export type VerificationRequiredResponse = OtpChallenge & {
  verification_required: true;
  user?: User;
};

export type TwoFactorRequiredResponse = OtpChallenge & {
  two_factor_required: true;
  user: User;
};

export type LoginResult = LoginResponse | VerificationRequiredResponse | TwoFactorRequiredResponse;

export type RegisterResponse = {
  token: string;
  user: User;
  api_key: ApiKeyReveal;
};

export type RegisterResult =
  | RegisterResponse
  | (VerificationRequiredResponse & { user: User });

export type VerifyEmailResponse = {
  email_verified: true;
  token: string;
  user: User;
  api_key?: ApiKeyReveal;
};

export type VerifyTwoFactorResponse = LoginResponse;

export type ResendChallengeResponse = {
  sent: true;
  challenge_id: string;
  expires_in_ms: number;
  resend_after_ms: number;
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
  low_code_spec?: LowCodeSpec | null;
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
