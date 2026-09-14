// Feedback and learning types — DB shape comes from Drizzle schema

export type { AiLearningEvent, NewAiLearningEvent, MerchantRule, NewMerchantRule } from '../../services/database/schema';

export interface CreateMerchantRuleInput {
  merchantPattern: string;
  categoryId: string;
  learnedFromEventId?: string;
}

export const RULE_PROMOTION_THRESHOLD = 3;
