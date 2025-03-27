import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { JupiterService } from '../services/JupiterService';
import '@types/jest';

describe('JupiterService', () => {
    let connection: Connection;
    let jupiterService: JupiterService;
    let inputMint: PublicKey;
    let outputMint: PublicKey;
    let testWallet: Keypair;

    beforeEach(async () => {
        // Setup test environment
        connection = new Connection('http://localhost:8899', 'confirmed');
        jupiterService = new JupiterService(connection);
        inputMint = new PublicKey(Keypair.generate().publicKey);
        outputMint = new PublicKey(Keypair.generate().publicKey);
        testWallet = Keypair.generate();

        // Initialize Jupiter service
        await jupiterService.initialize();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            const newService = new JupiterService(connection);
            await expect(newService.initialize()).resolves.not.toThrow();
        });

        it('should handle initialization errors gracefully', async () => {
            const badConnection = new Connection('http://invalid-url', 'confirmed');
            const newService = new JupiterService(badConnection);
            await expect(newService.initialize()).rejects.toThrow();
        });
    });

    describe('Route Finding', () => {
        it('should find best route for valid params', async () => {
            const route = await jupiterService.findBestRoute({
                inputMint,
                outputMint,
                amount: 1000,
                slippageBps: 100,
                wallet: testWallet
            });

            expect(route).not.toBeNull();
        });

        it('should handle invalid mints', async () => {
            const invalidMint = new PublicKey('invalid');
            await expect(jupiterService.findBestRoute({
                inputMint: invalidMint,
                outputMint,
                amount: 1000,
                slippageBps: 100,
                wallet: testWallet
            })).rejects.toThrow();
        });
    });

    describe('Trade Execution', () => {
        it('should execute trade with valid route', async () => {
            const txid = await jupiterService.executeTrade({
                inputMint,
                outputMint,
                amount: 1000,
                slippageBps: 100,
                wallet: testWallet
            });

            expect(typeof txid).toBe('string');
            expect(txid.length).toBeGreaterThan(0);
        });

        it('should handle trade execution errors', async () => {
            const invalidWallet = Keypair.generate();
            await expect(jupiterService.executeTrade({
                inputMint,
                outputMint,
                amount: 1000000000, // Very large amount
                slippageBps: 100,
                wallet: invalidWallet
            })).rejects.toThrow();
        });
    });

    describe('Price Impact Calculation', () => {
        it('should calculate price impact for different amounts', async () => {
            const impact = await jupiterService.calculatePriceImpact({
                inputMint,
                outputMint,
                amount: 1000
            });

            expect(typeof impact).toBe('number');
            expect(impact).toBeGreaterThanOrEqual(0);
        });

        it('should handle large amounts', async () => {
            const impact = await jupiterService.calculatePriceImpact({
                inputMint,
                outputMint,
                amount: 1000000
            });

            expect(impact).toBeGreaterThan(0);
        });
    });

    describe('Order Book Monitoring', () => {
        it('should update order book state', async () => {
            const state = await jupiterService.updateOrderBookState(inputMint, outputMint);
            
            expect(state.bids.length).toBeGreaterThan(0);
            expect(state.asks.length).toBeGreaterThan(0);
            expect(state.spread).toBeGreaterThanOrEqual(0);
            expect(state.timestamp).toBeLessThanOrEqual(Date.now());
        });

        it('should get current order book state', () => {
            const state = jupiterService.getOrderBookState();
            
            expect(state).toBeDefined();
            expect(state.timestamp).toBeLessThanOrEqual(Date.now());
        });

        it('should handle market data errors', async () => {
            const invalidMint = new PublicKey('invalid');
            await expect(jupiterService.updateOrderBookState(invalidMint, outputMint))
                .rejects.toThrow();
        });
    });
}); 