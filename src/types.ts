export type WalletType = 'WHALE' | 'RETAIL';

export interface Account {
    publicKey: string;
    privateKey: number[];
    type: WalletType;
    balance: number;
    status: string;
}

export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    type: 'BUY' | 'SELL';
}

export interface TradingStatus {
    isRunning: boolean;
    currentPattern: string | null;
    remainingTime: number | null;
    startTime: number | null;
    totalDuration: number | null;
}

export interface BalanceInfo {
    balances: {
        publicKey: string;
        balance: number;
        type: WalletType;
    }[];
    timestamp: number;
}

export interface TransactionOptions {
    commitment?: string;
    delayBetweenTransactions?: number;
    estimatedFee?: number;
}