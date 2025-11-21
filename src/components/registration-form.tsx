
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { registerUser, type FormState } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} size="lg">
      {pending ? <Loader2 className="animate-spin mr-2" /> : null}
      {pending ? 'Confirming...' : 'Confirm Registration'}
    </Button>
  );
}

export function RegistrationForm() {
  const initialState: FormState = { message: '' };
  const [state, formAction] = useActionState(registerUser, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && !state.errors) {
        // This is a success message from a redirect, which we don't want to show as a toast.
        // Errors will be handled below.
        return;
    }
    if (state.message && state.errors) {
      toast({
        title: 'Registration Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Enter your Cody Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="e.g., jane.doe@cody.inc" required autoComplete="email" />
        {state.errors?.email && (
          <p className="text-sm font-medium text-destructive">{state.errors.email.join(', ')}</p>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
