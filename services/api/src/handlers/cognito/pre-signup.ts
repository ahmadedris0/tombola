import { isValidE164 } from '@tombola/auth/phone';

interface PreSignUpEvent {
  userName: string;
  request: { userAttributes: Record<string, string> };
  response: Record<string, unknown>;
}

export const handler = async (event: PreSignUpEvent): Promise<PreSignUpEvent> => {
  if (!isValidE164(event.userName)) {
    throw new Error('Phone number must be in E.164 format');
  }
  return event;
};
