import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UserX, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
interface RedrawDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    participantName: string;
    onSwitch: () => void;
    onUnconfirm: () => void;
}

export function RedrawDialog({
    isOpen,
    onOpenChange,
    participantName,
    onSwitch,
    onUnconfirm,
}: RedrawDialogProps) {
    const [selectedOption, setSelectedOption] = useState<'switch' | 'unconfirm' | null>(null);

    const handleConfirm = () => {
        if (selectedOption === 'switch') {
            onSwitch();
        } else if (selectedOption === 'unconfirm') {
            onUnconfirm();
        }
        onOpenChange(false);
        setSelectedOption(null); // Reset selection on close
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => {
            if (!open) setSelectedOption(null);
            onOpenChange(open);
        }}>
            <AlertDialogContent className="sm:max-w-[600px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Redraw Participant</AlertDialogTitle>
                    <AlertDialogDescription>
                        What would you like to do with <strong>{participantName}</strong>?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Button
                        variant="outline"
                        className={cn(
                            "justify-start h-auto py-4 px-4 border-primary/50 hover:bg-primary/10 hover:text-foreground transition-all",
                            selectedOption === 'switch' && "bg-primary/10 ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedOption('switch')}
                    >
                        <RefreshCw className="mr-4 h-5 w-5 text-primary" />
                        <div className="text-left">
                            <div className="font-semibold">Switch Participant</div>
                            <div className="text-xs text-muted-foreground whitespace-normal">
                                Replace with another random participant. {participantName} will remain eligible for future draws.
                            </div>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className={cn(
                            "justify-start h-auto py-4 px-4 border-destructive/50 hover:bg-destructive/10 transition-all",
                            selectedOption === 'unconfirm' && "bg-destructive/10 ring-2 ring-destructive"
                        )}
                        onClick={() => setSelectedOption('unconfirm')}
                    >
                        <UserX className="mr-4 h-5 w-5 text-destructive" />
                        <div className="text-left">
                            <div className="font-semibold text-destructive">Unconfirm & Replace</div>
                            <div className="text-xs text-muted-foreground whitespace-normal">
                                Mark as unconfirmed and replace. {participantName} will be removed from the raffle.
                            </div>
                        </div>
                    </Button>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={!selectedOption}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
