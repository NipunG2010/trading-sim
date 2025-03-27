import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Jupiter, RouteInfo, TOKEN_LIST_URL } from '@jup-ag/core';
import { TokenInfo } from '@solana/spl-token-registry';

interface OrderBookState {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
    spread: number;
    timestamp: number;
}

interface TradeParams {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    slippageBps: number;
    wallet: Keypair;
}

interface PriceImpactParams {
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
}

export class JupiterService {
    private connection: Connection;
    private jupiter: Jupiter | null = null;
    private tokenList: TokenInfo[] = [];
    private orderBookState: OrderBookState = {
        bids: [],
        asks: [],
        spread: 0,
        timestamp: 0
    };

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Initialize Jupiter instance and load token list
     */
    async initialize(): Promise<void> {
        try {
            // Load Jupiter instance
            this.jupiter = await Jupiter.load({
                connection: this.connection,
                cluster: 'devnet', // or 'mainnet-beta'
                user: Keypair.generate() // Default user for price checking
            });

            // Load token list
            const response = await fetch(TOKEN_LIST_URL);
            const tokens = await response.json();
            this.tokenList = tokens;

            console.log('Jupiter service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Jupiter service:', error);
            throw error;
        }
    }

    /**
     * Find best route for a trade
     */
    async findBestRoute(params: TradeParams): Promise<RouteInfo | null> {
        if (!this.jupiter) {
            throw new Error('Jupiter not initialized');
        }

        try {
            const routes = await this.jupiter.computeRoutes({
                inputMint: params.inputMint,
                outputMint: params.outputMint,
                amount: params.amount,
                slippageBps: params.slippageBps
            });

            if (routes.routesInfos.length === 0) {
                console.log('No routes found');
                return null;
            }

            // Return best route by output amount
            return routes.routesInfos[0];
        } catch (error) {
            console.error('Error finding route:', error);
            throw error;
        }
    }

    /**
     * Execute a trade using the best route
     */
    async executeTrade(params: TradeParams): Promise<string> {
        if (!this.jupiter) {
            throw new Error('Jupiter not initialized');
        }

        try {
            const route = await this.findBestRoute(params);
            if (!route) {
                throw new Error('No valid route found');
            }

            const { transactions } = await this.jupiter.exchange({
                route,
                userPublicKey: params.wallet.publicKey
            });

            // Execute transaction
            const { swapTransaction } = transactions;
            if (!swapTransaction) {
                throw new Error('No swap transaction found');
            }

            const txid = await this.connection.sendTransaction(
                swapTransaction,
                [params.wallet],
                { skipPreflight: false }
            );

            await this.connection.confirmTransaction(txid, 'confirmed');
            return txid;
        } catch (error) {
            console.error('Error executing trade:', error);
            throw error;
        }
    }

    /**
     * Calculate price impact for a given trade size
     */
    async calculatePriceImpact(params: PriceImpactParams): Promise<number> {
        if (!this.jupiter) {
            throw new Error('Jupiter not initialized');
        }

        try {
            // Get quote for small amount to establish baseline price
            const baselineAmount = 1;
            const baselineRoute = await this.findBestRoute({
                ...params,
                amount: baselineAmount,
                slippageBps: 100,
                wallet: Keypair.generate()
            });

            if (!baselineRoute) {
                throw new Error('Could not establish baseline price');
            }

            // Get quote for actual amount
            const actualRoute = await this.findBestRoute({
                ...params,
                amount: params.amount,
                slippageBps: 100,
                wallet: Keypair.generate()
            });

            if (!actualRoute) {
                throw new Error('Could not get price for actual amount');
            }

            // Calculate price impact
            const baselinePrice = baselineRoute.outAmount / baselineAmount;
            const actualPrice = actualRoute.outAmount / params.amount;
            const priceImpact = (baselinePrice - actualPrice) / baselinePrice;

            return priceImpact;
        } catch (error) {
            console.error('Error calculating price impact:', error);
            throw error;
        }
    }

    /**
     * Update and monitor order book state
     */
    async updateOrderBookState(inputMint: PublicKey, outputMint: PublicKey): Promise<OrderBookState> {
        if (!this.jupiter) {
            throw new Error('Jupiter not initialized');
        }

        try {
            // Get current market state
            const { routesInfos } = await this.jupiter.computeRoutes({
                inputMint,
                outputMint,
                amount: 1,
                slippageBps: 100
            });

            if (routesInfos.length === 0) {
                throw new Error('No market data available');
            }

            // Extract order book state from best route
            const bestRoute = routesInfos[0];
            const marketInfos = bestRoute.marketInfos;

            // Update order book state
            this.orderBookState = {
                bids: marketInfos.map(info => ({
                    price: info.outAmount / info.inAmount,
                    size: info.inAmount
                })),
                asks: marketInfos.map(info => ({
                    price: info.inAmount / info.outAmount,
                    size: info.outAmount
                })),
                spread: this.calculateSpread(marketInfos),
                timestamp: Date.now()
            };

            return this.orderBookState;
        } catch (error) {
            console.error('Error updating order book state:', error);
            throw error;
        }
    }

    /**
     * Get current order book state
     */
    getOrderBookState(): OrderBookState {
        return this.orderBookState;
    }

    private calculateSpread(marketInfos: any[]): number {
        if (marketInfos.length < 2) return 0;
        const bestBid = Math.max(...marketInfos.map(info => info.outAmount / info.inAmount));
        const bestAsk = Math.min(...marketInfos.map(info => info.inAmount / info.outAmount));
        return (bestAsk - bestBid) / bestBid;
    }
} 