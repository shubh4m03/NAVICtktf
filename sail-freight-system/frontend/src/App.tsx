import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/shared/Layout';
import DashboardLayout from '@/components/DashboardLayout';


import CarrierIntelligence from '@/components/carrier-intelligence/CarrierIntelligence';
import FreightMarket from '@/components/freight-market/FreightMarket';
import RouteIntelligence from '@/components/route-intelligence/RouteIntelligence';
import VesselExplorer from '@/components/vessel-explorer/VesselExplorer';
import NirnayCommandCenter from '@/components/nirnayn/NirnayCommandCenter';

import { ThemeProvider } from '@/context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<DashboardLayout />} />
            <Route path="carrier" element={<CarrierIntelligence />} />
            <Route path="market" element={<FreightMarket />} />
            <Route path="vessels" element={<VesselExplorer />} />
            <Route path="routes" element={<RouteIntelligence />} />
            <Route path="decision" element={<DashboardLayout />} />
            <Route path="nirnayn" element={<NirnayCommandCenter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
