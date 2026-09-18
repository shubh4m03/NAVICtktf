import { FreightRate, MarketEvent } from '../types';
import { mockFreightRates } from '../data/mockFreightRates';
import { mockEvents } from '../data/mockEvents';

export type MarketTrend = 'RISING' | 'STABLE' | 'VOLATILE' | 'DECLINING';

export interface MarketAnalysis {
  currentRate: number;
  averageRate: number;
  trend: MarketTrend;
  volatility: number;
  percentageChange: number;
}

export const freightService = {
  getHistoricalRates: async (routeId: string, days: number = 30): Promise<FreightRate[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const filtered = mockFreightRates
          .filter(r => r.routeId === routeId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, days)
          .reverse();
        resolve(filtered);
      }, 300);
    });
  },

  getMarketEvents: async (): Promise<MarketEvent[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(mockEvents), 200));
  },

  analyzeMarket: (rates: FreightRate[]): MarketAnalysis => {
    if (rates.length === 0) {
      return { currentRate: 0, averageRate: 0, trend: 'STABLE', volatility: 0, percentageChange: 0 };
    }

    const first = rates[0];
    const last = rates[rates.length - 1];
    if (!first || !last) {
      return { currentRate: 0, averageRate: 0, trend: 'STABLE', volatility: 0, percentageChange: 0 };
    }

    const currentRate = last.rateUsdPerTonne;
    const startRate = first.rateUsdPerTonne;
    const percentageChange = startRate !== 0 ? ((currentRate - startRate) / startRate) * 100 : 0;
    
    const sum = rates.reduce((acc, curr) => acc + curr.rateUsdPerTonne, 0);
    const averageRate = sum / rates.length;

    // Calculate standard deviation for volatility
    const variance = rates.reduce((acc, curr) => acc + Math.pow(curr.rateUsdPerTonne - averageRate, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev / averageRate; // Normalized volatility

    let trend: MarketTrend = 'STABLE';
    if (volatility > 0.15) {
      trend = 'VOLATILE';
    } else if (percentageChange > 5) {
      trend = 'RISING';
    } else if (percentageChange < -5) {
      trend = 'DECLINING';
    }

    return {
      currentRate,
      averageRate,
      trend,
      volatility,
      percentageChange
    };
  }
};
