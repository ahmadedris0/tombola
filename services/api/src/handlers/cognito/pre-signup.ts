import { isValidE164 } from '@tombola/auth/phone';

interface PreSignUpEvent {
  userName: string;
  request: { userAttributes: Record<string, string> };
  response: Record<string, unknown>;
}

export const handler = async (event: PreSignUpEvent): Promise<PreSignUpEvent> => {
  // With UsernameAttributes=[phone_number], Cognito assigns a UUID userName and carries the
  // phone in the phone_number attribute — validate that, not userName.
  const phone = event.request.userAttributes.phone_number;
  if (phone && !isValidE164(phone)) {
    throw new Error('Phone number must be in E.164 format');
  }
  return event;
};
