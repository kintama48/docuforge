import { nanoid } from 'nanoid';

export type IdPrefix = 'usr' | 'key' | 'tpl' | 'ver' | 'ast' | 'log' | 'req' | 'oau';

export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${nanoid(21)}`;
}

export function generateUserId(): string {
  return generateId('usr');
}

export function generateApiKeyId(): string {
  return generateId('key');
}

export function generateTemplateId(): string {
  return generateId('tpl');
}

export function generateVersionId(): string {
  return generateId('ver');
}

export function generateAssetId(): string {
  return generateId('ast');
}

export function generateLogId(): string {
  return generateId('log');
}

export function generateRequestId(): string {
  return generateId('req');
}

export function generateOauthId(): string {
  return generateId('oau');
}
