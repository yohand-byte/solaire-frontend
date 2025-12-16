import { getIdTokenResult, User } from 'firebase/auth';

export async function getClaims(user: User) {
  const token = await getIdTokenResult(user, true);
  return token.claims as { role?: string };
}
