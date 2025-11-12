'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Settings, Rss } from 'lucide-react';
import { getRegistrations, getRegistrationStatus } from '@/lib/data';
import { setRegistrationStatus } from '@/app/actions';
import type { Registration } from '@/lib/types';
import { QrCodeDisplay } from '@/components/qr-code-display';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function RegistrationSwitch({ 
    isOpen,
    onToggle
 }: { 
    isOpen: boolean;
    onToggle: (checked: boolean) => void;
  }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleToggle = (checked: boolean) => {
        onToggle(checked);
        startTransition(async () => {
            const result = await setRegistrationStatus(checked);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
                onToggle(!checked); // Revert on failure
            }
        });
    };

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="registration-status"
                checked={isOpen}
                onCheckedChange={handleToggle}
                disabled={isPending}
            />
            <Label htmlFor="registration-status" className="flex flex-col">
                <span>Registration {isOpen ? 'Open' : 'Closed'}</span>
                 <span className="font-normal text-xs text-muted-foreground">
                    Turn this off to prevent new users from registering.
                </span>
            </Label>
        </div>
    );
}

export default function AdminDashboardPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

     useEffect(() => {
        async function loadData() {
        if (user && firestore) {
            setLoading(true);
            const [regs, status] = await Promise.all([
                getRegistrations(firestore),
                getRegistrationStatus(firestore)
            ]);
            setRegistrations(regs);
            setIsRegistrationOpen(status.isOpen);
            setLoading(false);
        }
        }
        loadData();
    }, [user, firestore]);

    if (userLoading || loading || !user) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <main>
            <div className="space-y-8">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{registrations.length}</div>
                            <p className="text-xs text-muted-foreground">participants so far</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Registration Status</CardTitle>
                            <Rss className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${isRegistrationOpen ? 'text-green-600' : 'text-destructive'}`}>
                                {isRegistrationOpen ? 'Open' : 'Closed'}
                            </div>
                            <p className="text-xs text-muted-foreground">Live status of the registration form</p>
                        </CardContent>
                    </Card>
                 </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings size={20} /> Event Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <RegistrationSwitch isOpen={isRegistrationOpen} onToggle={setIsRegistrationOpen} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                    <CardTitle>Registration QR Code</CardTitle>
                    <CardDescription>
                        Display or print this code for users to scan and register.
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-6">
                    <QrCodeDisplay />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
