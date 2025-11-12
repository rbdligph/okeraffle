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
      {pending ? 'Registering...' : 'Register'}
    </Button>
  );
}

export function RegistrationForm() {
  const initialState: FormState = { message: '' };
  const [state, formAction] = useActionState(registerUser, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.errors ? 'Registration Error' : 'Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" placeholder="e.g., Jane Doe" required autoComplete="name" />
        {state.errors?.fullName && (
          <p className="text-sm font-medium text-destructive">{state.errors.fullName.join(', ')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="e.g., jane.doe@example.com" required autoComplete="email" />
        {state.errors?.email && (
          <p className="text-sm font-medium text-destructive">{state.errors.email.join(', ')}</p>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
