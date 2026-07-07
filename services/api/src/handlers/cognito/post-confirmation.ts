import { putUserMirror } from '../../repository/users';

interface PostConfirmationEvent {
  triggerSource: string;
  request: { userAttributes: Record<string, string> };
}

export const handler = async (event: PostConfirmationEvent): Promise<PostConfirmationEvent> => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    const a = event.request.userAttributes;
    await putUserMirror({
      sub: a.sub!,
      phoneE164: a.phone_number!,
      fullName: a.name ?? '',
      locale: a.locale === 'ar' ? 'ar' : 'en',
      role: 'user',
    });
  }
  return event;
};
