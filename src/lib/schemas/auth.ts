import { z } from 'zod';

export const loginErrorCodes = [
	'invalidEmail',
	'passwordRequired',
	'invalidCredentials',
	'generic'
] as const;

export type LoginErrorCode = (typeof loginErrorCodes)[number];

export const loginSchema = z.object({
	email: z.email({ error: 'invalidEmail' }),
	password: z.string().min(1, { error: 'passwordRequired' })
});

export type LoginInput = z.infer<typeof loginSchema>;

export function toLoginErrorCode(value: unknown): LoginErrorCode {
	if (typeof value === 'string' && (loginErrorCodes as readonly string[]).includes(value)) {
		return value as LoginErrorCode;
	}
	return 'generic';
}
