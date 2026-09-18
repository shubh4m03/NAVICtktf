import { VesselClass, CargoProfile, PortInfo } from '../types';
import { mockVessels } from '../data/mockVessels';

export interface FeasibilityResult {
  vessel: VesselClass;
  isFeasible: boolean;
  reason?: string;
  compatibilityScore?: number;
}

export const vesselService = {
  getVessels: async (): Promise<VesselClass[]> => {
    // Simulate network delay
    return new Promise((resolve) => setTimeout(() => resolve(mockVessels), 300));
  },

  calculateCompatibility: (vessel: VesselClass, cargo: CargoProfile): number => {
    let score = 0;
    
    // Cargo type match
    if (vessel.primaryCargo.includes(cargo.category)) {
      score += 0.4;
    }

    // Capacity match (Vessel must be able to carry it, but ideally not be completely empty)
    if (cargo.weightTonnes <= vessel.capacityTonnes) {
      score += 0.3;
      // Penalize heavily if utilizing less than 40% of the vessel
      if (cargo.weightTonnes / vessel.capacityTonnes < 0.4) {
        score -= 0.15;
      }
    }

    // Temperature constraint
    if (cargo.status === 'perishable' && cargo.temperatureRequirement !== undefined) {
      if (vessel.capabilities.includes('temperature-control')) {
        score += 0.2;
      } else {
        score -= 0.5; // Strong penalty if reefer capability missing
      }
    } else {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  },

  evaluateFeasibility: (
    vessels: VesselClass[], 
    cargo: CargoProfile, 
    destinationPort: PortInfo
  ): { feasible: FeasibilityResult[]; infeasible: FeasibilityResult[] } => {
    
    const results = vessels.map(vessel => {
      // Constraint 1: Capacity
      if (cargo.weightTonnes > vessel.capacityTonnes) {
        return { vessel, isFeasible: false, reason: 'Exceeds maximum cargo capacity' };
      }

      // Constraint 2: Port Draft
      if (vessel.maxDraftMeters > destinationPort.maxDraftMeters) {
        return { vessel, isFeasible: false, reason: 'Exceeds maximum permitted port draft' };
      }

      // Constraint 3: Cargo Support at Port
      if (!destinationPort.supportedCargo.includes(cargo.category)) {
        return { vessel, isFeasible: false, reason: `Port does not support ${cargo.category} cargo` };
      }

      // Constraint 4: Temperature
      if (cargo.status === 'perishable' && !vessel.capabilities.includes('temperature-control')) {
        return { vessel, isFeasible: false, reason: 'Vessel lacks temperature control' };
      }

      const score = vesselService.calculateCompatibility(vessel, cargo);

      return {
        vessel,
        isFeasible: true,
        compatibilityScore: score
      };
    });

    return {
      feasible: results.filter(r => r.isFeasible).sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0)),
      infeasible: results.filter(r => !r.isFeasible)
    };
  }
};
