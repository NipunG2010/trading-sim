import { HybridSolanaAdapter } from './SolanaAdapter';
import { LangChain } from 'langchain';
import { generateText, streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { 
  TradingPatternConfig, 
  TradingDataPoint,
  TokenTransaction,
  TradingStatus 
} from '../types';

declare module 'eliza' {
  interface Eliza {
    configure(options: { personality: string; knowledgeBase: string }): void;
    processUpdate(update: string): void;
  }
}

const TradingPatternSchema = z.object({
  type: z.enum([
    'MOVING_AVERAGE_CROSSOVER',
    'FIBONACCI_RETRACEMENT',
    'BOLLINGER_BANDS',
    'MACD_CROSSOVER',
    'RSI_DIVERGENCE'
  ]),
  duration: z.number().positive(),
  intensity: z.number().min(1).max(10)
});

const MODEL_MAPPINGS = {
  MOVING_AVERAGE_CROSSOVER: 'anthropic/claude-3.5-sonnet',
  FIBONACCI_RETRACEMENT: 'meta-llama/llama-3.1-405b-instruct',
  BOLLINGER_BANDS: 'google/gemini-pro',
  MACD_CROSSOVER: 'mistralai/mistral-7b-instruct',
  RSI_DIVERGENCE: 'anthropic/claude-3-opus'
} as const;

export class TradingService {
  private adapter: HybridSolanaAdapter;
  private langChain: LangChain;
  private openRouter: ReturnType<typeof createOpenRouter>;
  private eliza: any;
  private tokenMint: string;
  private isRunning: boolean = false;
  private currentPattern: TradingPatternConfig | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(rpcEndpoint: string, tokenMint: string) {
    this.adapter = new HybridSolanaAdapter(rpcEndpoint, 'mainnet');
    this.langChain = new LangChain();
    this.openRouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || ''
    });
    this.tokenMint = tokenMint;
    this.eliza = new (require('eliza'))();
    this.initAI();
  }

  private async initAI(): Promise<void> {
    try {
      await this.langChain.init({
        model: 'gpt-4',
        tools: ['trading_analysis', 'risk_assessment']
      });
      this.eliza.configure({
        personality: 'trading-assistant',
        knowledgeBase: 'crypto-markets'
      });
    } catch (error) {
      console.error('AI initialization failed:', error);
      throw new Error('Failed to initialize AI components');
    }
  }

  public async startTrading(pattern: TradingPatternConfig): Promise<boolean> {
    try {
      const validatedPattern = TradingPatternSchema.parse(pattern);
      if (this.isRunning) await this.stopTrading();

      const modelType = validatedPattern.type as keyof typeof MODEL_MAPPINGS;
      const modelName = MODEL_MAPPINGS[modelType];
      const model = this.openRouter.chatModel(modelName);

      const { text: analysis } = await generateText({
        model,
        prompt: `Analyze this trading pattern for risks: ${JSON.stringify(validatedPattern)}`
      });

      const riskAssessment = await this.langChain.assessRisk(validatedPattern);
      if (riskAssessment.riskLevel > 7) {
        throw new Error(`High risk detected: ${riskAssessment.reason}`);
      }

      this.isRunning = true;
      this.currentPattern = validatedPattern;
      const wallet = await this.adapter.generateKeypair();
      await this.adapter.executeTrade(validatedPattern, wallet);
      this.startMonitoring(validatedPattern);
      return true;
    } catch (error) {
      console.error('Trading start failed:', error);
      this.isRunning = false;
      this.currentPattern = null;
      throw error;
    }
  }

  private async startMonitoring(pattern: TradingPatternConfig): Promise<void> {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);

    const modelType = pattern.type as keyof typeof MODEL_MAPPINGS;
    const modelName = MODEL_MAPPINGS[modelType];
    const model = this.openRouter.chatModel(modelName);

    this.monitoringInterval = setInterval(async () => {
      try {
        const stream = streamText({
          model,
          prompt: `Monitor trading pattern: ${JSON.stringify(pattern)}`
        });
        for await (const update of stream) {
          this.eliza.processUpdate(update);
          this.handleTradeUpdate(update);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 5000);
  }

  private handleTradeUpdate(update: string): void {
    console.log('Trade update:', update);
  }

  public async stopTrading(): Promise<boolean> {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      this.isRunning = false;
      this.currentPattern = null;
      return true;
    } catch (error) {
      console.error('Failed to stop trading:', error);
      throw error;
    }
  }

  public async getTradingStatus(): Promise<TradingStatus> {
    return {
      isRunning: this.isRunning,
      currentPattern: this.currentPattern,
      remainingTime: this.currentPattern 
        ? this.currentPattern.duration * 60 * 1000 - (Date.now() - (this.currentPattern as any).startTime)
        : null
    };
  }
}