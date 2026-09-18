import { PortInfo } from '../types';
import { mockPorts } from '../data/mockPorts';

export const portService = {
  getPorts: async (): Promise<PortInfo[]> => {
    return new Promise((resolve) => setTimeout(() => resolve(mockPorts), 150));
  },
  
  getPortById: async (id: string): Promise<PortInfo | undefined> => {
    const ports = await portService.getPorts();
    return ports.find(p => p.id === id);
  }
};
