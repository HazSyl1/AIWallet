// Transaction fingerprinting for duplicate detection

import type { TransactionProposal, Transaction } from '../types';

export const generateFingerprint = (
  tx: Pick<TransactionProposal | Transaction, 'amountPaise' | 'merchant' | 'occurredAt' | 'paymentAccountId'>
): string => {
  const parts = [
    (tx.amountPaise ?? 0).toString(),
    normalizeMerchant(tx.merchant || ''),
    tx.occurredAt ? tx.occurredAt.split('T')[0] : '',
    tx.paymentAccountId || '',
  ];
  return parts.join('|').toLowerCase();
};

export const normalizeMerchant = (merchant: string): string => {
  if (!merchant) return '';
  return merchant
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(pvt|ltd|limited|private|inc|llc|llp)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
};

export const findPotentialDuplicates = (
  proposal: TransactionProposal,
  existingTransactions: Transaction[],
  options: { checkSameDay?: boolean; amountTolerancePaise?: number } = {}
): Transaction[] => {
  const { checkSameDay = true, amountTolerancePaise = 0 } = options;
  const proposalFingerprint = generateFingerprint(proposal);
  const proposalDate = proposal.occurredAt?.split('T')[0];

  return existingTransactions.filter((tx) => {
    if (generateFingerprint(tx) === proposalFingerprint) return true;

    if (checkSameDay && proposalDate) {
      const txDate = tx.occurredAt?.split('T')[0];
      if (txDate === proposalDate) {
        const amountMatch =
          Math.abs((tx.amountPaise ?? 0) - proposal.amountPaise) <= amountTolerancePaise;
        const merchantMatch =
          normalizeMerchant(tx.merchant || '') === normalizeMerchant(proposal.merchant || '');
        if (amountMatch && merchantMatch) return true;
      }
    }

    return false;
  });
};

export const wasRecentlySeen = (
  proposal: TransactionProposal,
  existingTransactions: Transaction[],
  withinHours: number = 24
): boolean => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - withinHours);
  const recentTxs = existingTransactions.filter(
    (tx) => new Date(tx.createdAt) > cutoff
  );
  return findPotentialDuplicates(proposal, recentTxs).length > 0;
};
