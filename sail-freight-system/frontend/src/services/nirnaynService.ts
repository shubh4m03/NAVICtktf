import { CargoProfile, VesselClass, RouteInfo } from '../types';

export interface NirnayContext {
  cargo?: CargoProfile;
  vessels?: VesselClass[];
  vesselClass?: string;
  route?: RouteInfo;
  currentChartPeriod?: string;
  scenario?: {
    origin: string;
    destination: string;
    cargoTonnage: number;
    commodity: string;
  };
}

export interface NirnayResponse {
  objective: string;
  recommendedApproach: string;
  rationale: string[];
  alternatives?: string[];
  tradeoffs?: string[];
  marketContext?: string;
  confidence: number;
}

let globalNirnayContext: NirnayContext = {
  vesselClass: 'Panamax',
  scenario: {
    origin: 'Hay Point',
    destination: 'Paradip',
    cargoTonnage: 70000,
    commodity: 'Coal (Coking)',
  },
};

const contextListeners = new Set<(ctx: NirnayContext) => void>();

export const nirnaynService = {
  getActiveContext: (): NirnayContext => globalNirnayContext,
  setActiveContext: (update: Partial<NirnayContext>) => {
    globalNirnayContext = {
      ...globalNirnayContext,
      ...update,
      scenario: update.scenario ? { ...globalNirnayContext.scenario, ...update.scenario } : globalNirnayContext.scenario,
    };
    contextListeners.forEach((fn) => fn(globalNirnayContext));
  },
  subscribe: (fn: (ctx: NirnayContext) => void) => {
    contextListeners.add(fn);
    return () => {
      contextListeners.delete(fn);
    };
  },
  analyze: async (query: string, context?: NirnayContext): Promise<NirnayResponse> => {
    const effectiveContext = context || globalNirnayContext;
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = query.toLowerCase();

        // Specific dilemma: Capesize at Paradip
        if (q.includes('capesize') && q.includes('paradip')) {
          resolve({
            objective: 'Assess Capesize berthing feasibility at Paradip Port (India)',
            recommendedApproach: 'Reject Capesize charter; Nominate Geared Panamax or Kamsarmax (75k-82k DWT)',
            rationale: [
              'Paradip approach channel has a strict maximum permissible draft of 14.50 meters.',
              'A fully laden Capesize requires 18.0 to 18.5 meters scantling draft, resulting in an unsafe -3.5m negative under-keel clearance.',
              'Lightening cargo offshore via transshipment barges incurs demurrage risks and $4.80/MT transshipment surcharge.'
            ],
            alternatives: ['Split cargo into 2 x 75,000 MT Panamax shipments', 'Divert Capesize to Dhamra Port (18.0m deep-water draft)'],
            tradeoffs: [
              'Panamax yields ~$1.40/MT higher ocean freight than single Capesize, but avoids total casualty/grounding risk.',
              'Dhamra diversion requires coastal rail transshipment to end-user plant.'
            ],
            marketContext: 'Panamax spot rates are currently firming at $13.40/MT on the Australia-East Coast India corridor.',
            confidence: 0.98
          });
          return;
        }

        // Specific dilemma: Spot vs Time Charter
        if (q.includes('spot') || q.includes('time charter') || q.includes('lock in')) {
          resolve({
            objective: 'Evaluate Charter Timing: Spot Market Voyage vs 30-Day Period Time Charter',
            recommendedApproach: 'Execute 30-Day Short Period Time Charter within the next 48 hours',
            rationale: [
              'Freight forward indices demonstrate a +12.4% upward trajectory across the Pacific basin.',
              'Bunker fuel prices (VLSFO Singapore) have risen +1.8% week-on-week, which shipowners are passing into spot quotes.',
              'Securing a short-term charter now insulates against an estimated $1.80/MT spot freight surge over the next 14 days.'
            ],
            alternatives: ['Float 40% volume on spot, lock 60% on index-linked contract'],
            tradeoffs: [
              'Period charter incurs financial commitment if commodity discharge operations are delayed.',
              'Spot retains upside if Chinese steel mill demand abruptly softens.'
            ],
            marketContext: 'Capesize & Panamax BDI sub-indices show consistent tonnage shortages in the Eastern hemisphere.',
            confidence: 0.91
          });
          return;
        }

        // Specific dilemma: Suez vs Cape of Good Hope
        if (q.includes('suez') || q.includes('cape') || q.includes('red sea')) {
          resolve({
            objective: 'Comparative Analysis: Suez Canal Transit vs Cape of Good Hope Diversion',
            recommendedApproach: 'Route via Cape of Good Hope with advance speed optimization (13.0 kts eco-speed)',
            rationale: [
              'Red Sea war risk insurance premiums have surged by 0.75% of vessel hull value.',
              'Cape transit avoids Suez transit canal toll of ~$340,000 to $480,000 per voyage.',
              'Steaming days increase by +9.8 days, but overall voyage security risk is minimized.'
            ],
            alternatives: ['Naval-escorted convoy via Bab el-Mandeb (Subject to schedule lottery)'],
            tradeoffs: [
              'Additional 310 MT VLSFO bunker fuel consumed due to extra 3,500 NM voyage distance.',
              'Supply chain pipeline delay of approximately 10 calendar days.'
            ],
            marketContext: 'Over 78% of global bulk and container tonnage is currently routed via Southern Africa.',
            confidence: 0.94
          });
          return;
        }

        // Default cargo-based evaluation
        const tonnage = effectiveContext.cargo?.weightTonnes || 70000;
        if (tonnage > 100000) {
          resolve({
            objective: `Optimize carrier allocation for ${tonnage.toLocaleString()} MT ${effectiveContext.cargo?.type || 'Bulk'}`,
            recommendedApproach: 'Deploy Capesize Bulker (180,000 DWT class)',
            rationale: [
              `High-volume parcel (${tonnage.toLocaleString()} MT) achieves optimal economy of scale on long-haul routes.`,
              'Minimizes per-tonne freight cost to baseline operational levels.'
            ],
            alternatives: ['Dual Panamax consignment (2 x 55k-75k MT)'],
            tradeoffs: ['Requires verified deep-water discharge berth (min 18m draft)'],
            confidence: 0.89
          });
        } else {
          resolve({
            objective: `Optimize carrier allocation for ${tonnage.toLocaleString()} MT ${effectiveContext.cargo?.type || 'Cargo'}`,
            recommendedApproach: 'Deploy Panamax / Kamsarmax Vessel (75,000 - 82,000 DWT)',
            rationale: [
              `Perfect parcel match for ${tonnage.toLocaleString()} MT without deadfreight penalty.`,
              'Draft fits standard industrial bulk berths globally (< 14.5m).'
            ],
            alternatives: ['Supramax with self-unloading cranes if destination lacks shore unloaders'],
            tradeoffs: ['Slightly higher unit cost per tonne compared to ultra-large Capesize carriers.'],
            confidence: 0.92
          });
        }
      }, 400);
    });
  }
};
