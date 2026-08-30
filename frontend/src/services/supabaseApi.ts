import { supabase } from '../supabase';
import type { AnalyticsSummary, CollectionAnalytics, HubAnalyticsItem, FleetAnalytics, RouteAnalytics, RecyclingAnalytics, WasteTypeAnalyticsItem, IncidentAnalytics, QRAnalytics, DriverPerformanceItem, CleanerPerformanceItem, FacilityAnalyticsItem, OperationalTrendItem, LiveFeedEvent } from '../types';

export const supabaseApi = {
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    return {
      totalResidents: 1500,
      activeResidents: 1200,
      totalCollectionRequests: 450,
      completedCollections: 410,
      pendingCollections: 28,
      missedCollections: 12,
      cancelledCollections: 0,
      totalWasteCollectedKg: 15420,
      totalWasteTransferredKg: 14000,
      totalWasteProcessedKg: 13500,
      totalRecoveredKg: 9500,
      totalResidualKg: 4000,
      recyclingRecoveryRate: 48.5,
      totalVehicles: 24,
      activeVehicles: 20,
      totalRoutes: 15,
      activeRoutes: 12,
      completedRoutes: 3,
      totalHubs: 12,
      activeHubs: 12,
      criticalHubs: 1,
      totalIncidents: 20,
      openIncidents: 5,
      totalQrScans: 1250,
      successfulQrScans: 1200,
      qrComplianceRate: 96.0,
      operationalEfficiencyIndex: 94.2
    };
  },
  
  getAnalyticsCollections: async (): Promise<CollectionAnalytics> => {
    return {
      totalRequests: 450,
      completedRequests: 410,
      pendingRequests: 20,
      assignedRequests: 5,
      enRouteRequests: 2,
      collectingRequests: 1,
      missedRequests: 12,
      cancelledRequests: 0,
      rescheduledRequests: 0,
      totalCollectedKg: 15420,
      averageCollectionWeightKg: 35.5,
      averageCompletionTimeMin: 45,
      collectionSuccessRate: 91.5,
      missedCollectionRate: 2.6,
      priorities: { low: 50, normal: 300, high: 80, urgent: 20 }
    };
  },
  
  getAnalyticsHubs: async (): Promise<HubAnalyticsItem[]> => {
    const { data } = await supabase.from('hubs').select('*');
    if (data && data.length > 0) {
      return data.map((h: any) => ({
        hubId: h.id,
        hubCode: h.hub_code || `HUB-${h.id}`,
        name: h.name,
        maximumCapacityKg: h.capacity_kg || 5000,
        currentInventoryKg: h.current_load_kg || 0,
        availableCapacityKg: Math.max(0, (h.capacity_kg || 5000) - (h.current_load_kg || 0)),
        utilizationPercentage: ((h.current_load_kg || 0) / (h.capacity_kg || 5000)) * 100,
        inboundKg: 0,
        outboundKg: 0,
        activeCleaners: 0,
        pendingCollections: 0,
        pendingTransfers: 0,
        status: h.status === 'NORMAL' ? 0 : 1,
        alertCount: 0
      }));
    }
    return [
      {
        hubId: 1,
        hubCode: 'HUB-01',
        name: 'North Hub',
        maximumCapacityKg: 5000,
        currentInventoryKg: 3200,
        availableCapacityKg: 1800,
        utilizationPercentage: 64,
        inboundKg: 4200,
        outboundKg: 1000,
        activeCleaners: 4,
        pendingCollections: 2,
        pendingTransfers: 1,
        status: 0,
        alertCount: 0
      },
      {
        hubId: 2,
        hubCode: 'HUB-02',
        name: 'South Hub',
        maximumCapacityKg: 4500,
        currentInventoryKg: 4100,
        availableCapacityKg: 400,
        utilizationPercentage: 91.1,
        inboundKg: 5100,
        outboundKg: 1000,
        activeCleaners: 6,
        pendingCollections: 5,
        pendingTransfers: 2,
        status: 1,
        alertCount: 1
      }
    ];
  },
  
  getAnalyticsFleet: async (): Promise<FleetAnalytics> => {
    return {
      totalVehicles: 25,
      activeVehicles: 22,
      inactiveVehicles: 3,
      underMaintenance: 3,
      availableVehicles: 15,
      assignedVehicles: 4,
      onRouteVehicles: 2,
      atCapacityVehicles: 1,
      totalFleetCapacityKg: 25000,
      currentFleetLoadKg: 8500,
      fleetUtilizationPercentage: 34,
      inspectionPasses: 110,
      inspectionFailures: 2,
      vehicles: []
    };
  },
  
  getAnalyticsRoutes: async (): Promise<RouteAnalytics> => ({
    totalRoutes: 15, plannedRoutes: 2, dispatchedRoutes: 1, acceptedRoutes: 1,
    activeRoutes: 12, completedRoutes: 3, cancelledRoutes: 0,
    averageRouteDurationMin: 45, averageStopsPerRoute: 12,
    totalStops: 180, completedStops: 140, pendingStops: 40,
    routeUtilizationPercentage: 88, routes: []
  }),
  
  getAnalyticsRecycling: async (): Promise<RecyclingAnalytics> => ({
    totalInputKg: 12000, totalClassifiedKg: 11000, totalSegregatedKg: 10500,
    totalProcessedKg: 10000, totalRecoveredKg: 9500, totalResidualKg: 2500,
    recoveryRate: 79.1, residualRate: 20.9, processingLossKg: 500, processingLossRate: 4.1,
    totalBatches: 150, activeBatches: 5, completedBatches: 145
  }),
  
  getAnalyticsWasteTypes: async (): Promise<WasteTypeAnalyticsItem[]> => ([
    { wasteType: 'General', collectedKg: 8500, processedKg: 8000, recoveredKg: 5000, residualKg: 3000, percentageOfTotal: 45 },
    { wasteType: 'Recyclable', collectedKg: 6500, processedKg: 6000, recoveredKg: 5500, residualKg: 500, percentageOfTotal: 35 },
    { wasteType: 'Organic', collectedKg: 3800, processedKg: 3500, recoveredKg: 3000, residualKg: 500, percentageOfTotal: 20 }
  ]),
  
  getAnalyticsIncidents: async (): Promise<IncidentAnalytics> => {
    const { data } = await supabase.from('incidents').select('*');
    let open = 5, resolved = 15, total = 20;
    if (data && data.length > 0) {
      total = data.length;
      open = data.filter((i: any) => i.status === 'OPEN').length;
      resolved = data.filter((i: any) => i.status === 'RESOLVED').length;
    }
    return {
      totalIncidents: total, openIncidents: open, resolvedIncidents: resolved,
      severity: { critical: 1, high: 2, medium: 5, low: 12 },
      types: { missedCollection: 5, weightVariance: 3, vehicleFailure: 2, qrFailure: 1, capacityOverflow: 4, routeException: 2, facilityRejection: 1, safety: 0, other: 2 }
    };
  },
  
  getAnalyticsQR: async (): Promise<QRAnalytics> => ({
    totalScans: 1250, successfulScans: 1200, failedScans: 50,
    complianceRate: 96.0,
    byType: { vehicle: 400, hub: 300, route: 200, stop: 250, facility: 100 }
  }),
  
  getAnalyticsDrivers: async (): Promise<DriverPerformanceItem[]> => {
    return [
      {
        driverId: 1,
        name: 'John Driver',
        employeeCode: 'DRV-001',
        assignedRoutes: 45,
        acceptedRoutes: 44,
        completedRoutes: 43,
        cancelledRoutes: 1,
        completedStops: 420,
        missedStops: 5,
        totalCollectedKg: 12500,
        averageRouteCompletionTimeMin: 42,
        weightVarianceIncidents: 1,
        qrScanFailures: 0,
        inspectionFailures: 0,
        performanceScore: 91.8
      }
    ];
  },
  
  getAnalyticsCleaners: async (): Promise<CleanerPerformanceItem[]> => {
    return [
      { cleanerId: 2, name: 'Sarah Cleaner', assignedHubId: 1, assignedCollections: 150, completedCollections: 145, missedCollections: 5, totalCollectedKg: 4500, averageCollectionWeightKg: 31, weightVarianceIncidents: 2, successfulDeposits: 140, performanceScore: 95 }
    ];
  },
  
  getAnalyticsFacilities: async (): Promise<FacilityAnalyticsItem[]> => {
    return [
      { facilityId: 1, facilityCode: 'FAC-01', name: 'Main Recycling', facilityType: 'MRF', receivedKg: 50000, acceptedLoads: 45, rejectedLoads: 2, quarantinedLoads: 1, activeBatches: 5, completedBatches: 40, recoveredKg: 42000, residualKg: 8000, recoveryRate: 84, maximumDailyCapacityKg: 100000, currentOperationalStatus: 'NORMAL' }
    ];
  },
  
  getAnalyticsTrends: async (): Promise<OperationalTrendItem[]> => {
    return [
      { date: '2026-08-20', requests: 120, completed: 115, missed: 5, wasteKg: 2400, recoveredKg: 1800, incidentCount: 2 },
      { date: '2026-08-21', requests: 130, completed: 128, missed: 2, wasteKg: 2600, recoveredKg: 2000, incidentCount: 1 },
      { date: '2026-08-22', requests: 125, completed: 120, missed: 5, wasteKg: 2500, recoveredKg: 1900, incidentCount: 3 }
    ];
  },
  
  getAnalyticsLiveFeed: async (): Promise<LiveFeedEvent[]> => {
    return [];
  }
};
