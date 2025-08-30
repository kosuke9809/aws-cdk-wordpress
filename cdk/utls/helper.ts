import { randomBytes } from 'crypto';

export const generatePassword = (length: number = 16): string => {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const randomValues = randomBytes(length);
  for (let i = 0; i < length; i++) {
    const index = randomValues[i] % charset.length;
    password += charset[index];
  }
  return password;
};
