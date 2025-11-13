import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function SuccessContent({
  name,
  isExisting,
}: {
  name: string;
  isExisting: boolean;
}) {
  const title = isExisting ? 'Already Registered' : 'Registration Successful!';
  const description = isExisting
    ? `Welcome back, ${decodeURIComponent(name)}! Your registration is confirmed.`
    : `Congratulations, ${decodeURIComponent(name)}! You're all set for the raffle.`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-lg text-center p-4 shadow-2xl">
        <CardHeader>
          <div className="mx-auto bg-accent/10 rounded-full p-3 w-fit">
            {isExisting ? (
              <Info className="w-10 h-10 text-accent" />
            ) : (
              <CheckCircle className="w-10 h-10 text-accent" />
            )}
          </div>
          <CardTitle className="font-headline text-3xl mt-4">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            You can use your email to register again if you need to check your status.
          </p>
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-sm text-muted-foreground">Your raffle entry is confirmed.</p>
            <p className="font-bold text-3xl text-accent font-headline">Good luck!</p>
          </div>
          <Button asChild>
            <Link href="/">Register Another Person</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { name?: string; existing?: string };
}) {
  const { name, existing } = searchParams;
  const isExisting = existing === 'true';

  return (
    <main>
      <Suspense fallback={<div className="text-center py-20">Loading your confirmation...</div>}>
        {name ? (
          <SuccessContent name={name} isExisting={isExisting} />
        ) : (
          <div className="text-center py-20">
            <p className="font-bold text-destructive">Invalid access.</p>
            <Button asChild variant="link">
              <Link href="/">Go to Registration</Link>
            </Button>
          </div>
        )}
      </Suspense>
    </main>
  );
}
