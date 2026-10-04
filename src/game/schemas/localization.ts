import { z } from 'zod';
import { LocalizationKeySchema } from './ids';

export const LocaleTableSchema = z.record(LocalizationKeySchema, z.string().min(1));
export type LocaleTable = z.infer<typeof LocaleTableSchema>;
