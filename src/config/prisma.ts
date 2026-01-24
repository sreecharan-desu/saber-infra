import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../utils/encryption';

const prisma = new PrismaClient().$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }: { model: string, operation: string, args: any, query: (args: any) => Promise<any> }) {
                // 1. Define sensitive fields per model (Refined with new models)
                const encryptedFieldsMap: Record<string, string[]> = {
                    User: ['name', 'email', 'intent_text', 'why_text', 'constraints_json'],
                    OAuthAccount: ['access_token', 'refresh_token', 'raw_data_json'],
                    Company: ['name', 'website', 'email'],
                    Job: ['problem_statement', 'expectations', 'non_negotiables', 'deal_breakers', 'constraints_json'],
                    Message: ['content'],
                    Bookmark: ['notes'],
                    Application: ['cover_note'],
                    RecommendationProfile: ['positive_signals_json', 'negative_signals_json', 'suppression_rules_json'],
                };

                const sensitiveFields = encryptedFieldsMap[model] || [];

                // 2. Query Rewriting for Search (Blind Index)
                if (args.where && model === 'User' && args.where.email) {
                    const emailValue = typeof args.where.email === 'string'
                        ? args.where.email
                        : args.where.email.equals;

                    if (emailValue) {
                        args.where.email_hash = EncryptionService.generateBlindIndex(emailValue);
                        delete args.where.email;
                    }
                }

                // 3. Encryption on WRITE
                const writeOperations: string[] = ['create', 'update', 'upsert', 'createMany', 'updateMany'];
                if (writeOperations.includes(operation)) {
                    const encryptData = (data: any) => {
                        if (!data) return data;

                        if (model === 'User' && data.email) {
                            data.email_hash = EncryptionService.generateBlindIndex(data.email);
                        }

                        for (const field of sensitiveFields) {
                            if (data[field] !== undefined && data[field] !== null) {
                                if (typeof data[field] === 'object') {
                                    data[field] = EncryptionService.encryptJson(data[field]);
                                } else if (typeof data[field] === 'string') {
                                    data[field] = EncryptionService.encrypt(data[field]);
                                }
                            }
                        }
                        return data;
                    };

                    if (args.data) {
                        args.data = Array.isArray(args.data)
                            ? args.data.map(encryptData)
                            : encryptData(args.data);
                    }
                }

                // 4. Exec query
                const result = await query(args);

                // 5. Decryption on READ
                const decryptData = (data: any, currentModel: string): any => {
                    if (!data) return data;

                    // Handle arrays (like findMany)
                    if (Array.isArray(data)) {
                        return data.map(item => decryptData(item, currentModel));
                    }

                    const sensitiveFields = encryptedFieldsMap[currentModel] || [];

                    // Decrypt fields of the current model
                    for (const field of sensitiveFields) {
                        if (data[field] !== undefined && data[field] !== null && typeof data[field] === 'string') {
                            const decrypted = EncryptionService.decrypt(data[field]);
                            try {
                                if (field.endsWith('_json') || typeof data[field] === 'object') {
                                    data[field] = JSON.parse(decrypted);
                                } else {
                                    data[field] = decrypted;
                                }
                            } catch {
                                data[field] = decrypted;
                            }
                        }
                    }

                    // RECURSION: Look for nested models in 'include' or 'select'
                    for (const key in data) {
                        if (data[key] && typeof data[key] === 'object') {
                            // Map the key to a model name (e.g., 'oauth_accounts' -> 'OAuthAccount')
                            // This is a simple heuristic mapping for SABER's schema
                            const modelMapping: Record<string, string> = {
                                oauth_accounts: 'OAuthAccount',
                                jobs: 'Job',
                                company: 'Company',
                                skills: 'Skill',
                                swipes: 'Swipe',
                                matches: 'Match',
                                messages: 'Message',
                                bookmarks: 'Bookmark',
                                applications: 'Application'
                            };

                            const nextModel = modelMapping[key];
                            if (nextModel) {
                                data[key] = decryptData(data[key], nextModel);
                            }
                        }
                    }

                    return data;
                };

                if (result) {
                    return decryptData(result, model);
                }

                return result;
            },
        },
    },
});

export default prisma;
