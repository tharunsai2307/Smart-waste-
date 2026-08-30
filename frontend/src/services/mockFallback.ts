export function getMockData(url: string): any {
  // Hubs
  if (url.includes('/hubs')) {
    if (url.includes('/transactions')) return [];
    if (url.includes('/cleaners')) return [];
    if (url.includes('/dashboard')) return {
      dailyCollections: 12,
      activeCleaners: 4,
      totalWasteKg: 1500,
      criticalAlerts: 0,
      utilizationPct: 45
    };
    return [
      { hubId: 1, name: 'North Hub', currentLoadKg: 2000, capacityKg: 5000, status: 'NORMAL' },
      { hubId: 2, name: 'South Hub', currentLoadKg: 4000, capacityKg: 4500, status: 'WARNING' }
    ];
  }

  // Vehicles
  if (url.includes('/vehicles')) {
    return [
      { vehicleId: 1, plateNumber: 'SW-01', status: 'ACTIVE', fuelLevel: 80 },
      { vehicleId: 2, plateNumber: 'SW-02', status: 'MAINTENANCE', fuelLevel: 10 }
    ];
  }

  // Drivers
  if (url.includes('/drivers/assignment')) {
    return {
      assignmentId: 1,
      driverId: 1,
      vehicleId: 1,
      routeId: 1,
      status: 'ACTIVE'
    };
  }
  if (url.includes('/drivers')) {
    return [
      { driverId: 1, name: 'John Doe', status: 'ACTIVE' },
      { driverId: 2, name: 'Jane Smith', status: 'INACTIVE' }
    ];
  }

  // Transfers
  if (url.includes('/transfers/analytics')) {
    return {
      totalTransfers: 15,
      completed: 12,
      inProgress: 2,
      cancelled: 1,
      failed: 0,
      totalWeightPlannedKg: 5000,
      totalWeightDeliveredKg: 4800,
      avgLoadVariancePct: 4
    };
  }
  if (url.includes('/transfers/history') || url.includes('/transfers/my') || url.includes('/transfers')) {
    return [
      { transferId: 101, status: 'COMPLETED', scheduledDeparture: new Date().toISOString(), scheduledWeightKg: 1500, actualDeliveredWeightKg: 1450 }
    ];
  }

  // Collections / Cleaner
  if (url.includes('/collections')) {
    return [
      { collectionId: 1, wasteType: 'Plastic', status: 'COMPLETED', actualWeightKg: 45, date: new Date().toISOString() },
      { collectionId: 2, wasteType: 'Organic', status: 'ASSIGNED', estimatedWeightKg: 20, date: new Date().toISOString() }
    ];
  }

  // Residents
  if (url.includes('/residents')) {
    return [];
  }

  // Recycling
  if (url.includes('/recycling/batches')) {
    return { batches: [
      { batchId: 1, facilityId: 1, status: 'COMPLETED', inputWeightKg: 500, recoveredKg: 450, residualKg: 50 }
    ] };
  }
  if (url.includes('/recycling/arrivals')) {
    return { arrivals: [] };
  }
  if (url.includes('/recycling/facilities')) {
    return [
      { facilityId: 1, name: 'Main Processing Center', status: 'ACTIVE' }
    ];
  }
  if (url.includes('/recycling')) {
    return [];
  }

  // Incidents
  if (url.includes('/incidents/timeline') || url.includes('/incidents/comments')) {
    return [];
  }
  if (url.includes('/incidents')) {
    return [
      { incidentId: 1, type: 'VEHICLE_BREAKDOWN', severity: 'HIGH', status: 'OPEN', description: 'Engine stalled on Route A' },
      { incidentId: 2, type: 'MISSED_COLLECTION', severity: 'LOW', status: 'RESOLVED', description: 'Bin was inaccessible' }
    ];
  }

  // Alerts
  if (url.includes('/alerts')) {
    return [];
  }

  // Governance / System
  if (url.includes('/system/health')) {
    return { status: 'HEALTHY', uptime: 99.9, lastCheck: new Date().toISOString() };
  }
  if (url.includes('/system/integrity')) {
    return [];
  }
  if (url.includes('/backups')) {
    return [];
  }
  if (url.includes('/archives')) {
    return [];
  }

  // Fallback for POST requests or anything else
  return { success: true, message: 'Mock success' };
}
