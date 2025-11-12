import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistrationForm } from '@/components/registration-form';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { initializeFirebase } from '@/firebase';
import { getRegistrationStatus } from '@/lib/data';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function Home() {
  const { firestore } = initializeFirebase();
  const { isOpen } = await getRegistrationStatus(firestore);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="w-full px-4 md:px-6 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold font-headline tracking-tighter sm:text-5xl xl:text-6xl/none text-accent">
                Join the Slumber Christmas Party with Cody
              </h1>
              <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
                Register for our event and instantly get your raffle number. Don&apos;t miss out on your chance to win
                amazing prizes!
              </p>
            </div>

            {isOpen ? (
              <div className="w-full grid md:grid-cols-2 gap-8 items-stretch justify-center max-w-4xl">
                <Card className="w-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Register Now</CardTitle>
                    <CardDescription>Fill out the form below to get your raffle number.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center">
                    <RegistrationForm />
                  </CardContent>
                </Card>
                <Card className="w-full flex flex-col">
                  <CardHeader>
                    <CardTitle>Scan to Register</CardTitle>
                    <CardDescription>Use your phone to scan the QR code and register on the go.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                    <QrCodeDisplay />
                  </CardContent>
                </Card>
              </div>
            ) : (
                <Alert variant="destructive" className="max-w-md text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Registration Closed</AlertTitle>
                  <AlertDescription>
                    We're sorry, but registration for this event is currently closed. Please check back later or contact the event organizer.
                  </AlertDescription>
                </Alert>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
