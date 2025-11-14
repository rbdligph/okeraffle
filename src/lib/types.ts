export type Registration = {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
};

export type RaffleItem = {
    id: string;
    name: string;
    description: string;
    prizeType: 'minor' | 'major' | 'grand';
};

export type Winner = {
  id: string; // Composite key like `round-registrationId` test
  registrationId: string;
  fullName: string;
  prizeId: string;
  prizeName: string;
  prizeType: 'minor' | 'major' | 'grand';
  round: number;
  confirmedAt: Date;
}
