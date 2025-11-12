'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

function formatFirestoreError(context: SecurityRuleContext): string {
  const intro = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:`;
  try {
    const contextString = JSON.stringify(context, null, 2);
    return `${intro}\n${contextString}`;
  } catch (e) {
    return intro;
  }
}

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const formattedMessage = formatFirestoreError(context);
    super(formattedMessage);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to ensure the stack trace is captured correctly in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}