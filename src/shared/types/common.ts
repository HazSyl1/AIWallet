// Common type definitions used across the app

export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund';

export type CaptureSource = 'manual' | 'text' | 'voice' | 'image' | 'connected_byok';

export type Currency = 'INR'; // v1 supports only INR

export type AccountType = 'cash' | 'bank' | 'card' | 'wallet';

export type CategoryType = 'expense' | 'income';

// Device capability tiers (Section 4.5)
export type DeviceTier = 'core' | 'ai_lite' | 'ai_standard' | 'connected';

// Import job status
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Timestamp helpers
export type ISOTimestamp = string; // ISO 8601 format

// ID type for entities
export type EntityId = string;
