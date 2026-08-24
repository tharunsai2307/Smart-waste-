import os

file_path = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\server.c"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix roles
content = content.replace('case ROLE_COLLECTION_MANAGER: return "COLLECTION_MANAGER";', 'case ROLE_LOCAL_HUB_MANAGER: return "LOCAL_HUB_MANAGER";\n        case ROLE_CLEANER:            return "CLEANER";\n        case ROLE_DRIVER:             return "DRIVER";\n        case ROLE_RECYCLING_MANAGER:  return "RECYCLING_MANAGER";')
content = content.replace('case ROLE_OPERATOR:           return "OPERATOR";\n', '')

# Fix BinStatus (no change needed in server.c, types.h matches)

# Fix VehicleStatus
content = content.replace('case VEHICLE_ON_ROUTE:    return "ON_ROUTE";', 'case VEHICLE_LOADING:     return "LOADING";\n        case VEHICLE_ON_ROUTE:    return "ON_ROUTE";')
content = content.replace('case VEHICLE_FULL:        return "FULL";\n        case VEHICLE_MAINTENANCE: return "MAINTENANCE";', 'case VEHICLE_FULL:        return "FULL";\n        case VEHICLE_MAINTENANCE: return "MAINTENANCE";\n        case VEHICLE_OUT_OF_SERVICE: return "OUT_OF_SERVICE";\n        case VEHICLE_RETIRED:     return "RETIRED";')

# Fix CollectionStatus
content = content.replace('case COLLECTION_PENDING:    return "PENDING";', 'case COLLECTION_REQUESTED:    return "REQUESTED";\n        case COLLECTION_UNDER_REVIEW:   return "UNDER_REVIEW";')
content = content.replace('case COLLECTION_ON_ROUTE:   return "ON_ROUTE";', 'case COLLECTION_EN_ROUTE:       return "EN_ROUTE";\n        case COLLECTION_ARRIVED:        return "ARRIVED";')
content = content.replace('case COLLECTION_COMPLETED:  return "COMPLETED";', 'case COLLECTION_COLLECTED:      return "COLLECTED";\n        case COLLECTION_DEPOSIT_PENDING: return "DEPOSIT_PENDING";\n        case COLLECTION_DEPOSITED_AT_HUB: return "DEPOSITED_AT_HUB";\n        case COLLECTION_COMPLETED:      return "COMPLETED";')
content = content.replace('case COLLECTION_CANCELLED:  return "CANCELLED";', 'case COLLECTION_CANCELLED:      return "CANCELLED";\n        case COLLECTION_MISSED:         return "MISSED";\n        case COLLECTION_REJECTED:       return "REJECTED";\n        case COLLECTION_RESCHEDULED:    return "RESCHEDULED";')

# Fix handleGetVehicles
content = content.replace('float loadPct = v.capacity > 0 ? (v.currentLoad / v.capacity) * 100.0f : 0;', 'float loadPct = v.capacityKg > 0 ? (v.currentLoad / v.capacityKg) * 100.0f : 0;')
content = content.replace('jsonStr(drv, sizeof(drv), v.driverName);', 'jsonStr(drv, sizeof(drv), "Unassigned"); // driverName removed')
content = content.replace('v.vehicleId, num, drv, v.capacity, v.currentLoad, loadPct, vehicleStatusToStr(v.status));', 'v.vehicleId, num, drv, v.capacityKg, v.currentLoad, loadPct, vehicleStatusToStr(v.status));')

# Fix handleGetCollections
content = content.replace('jsonStr(rd, sizeof(rd), req.requestDate);', 'jsonStr(rd, sizeof(rd), req.requestedAt);')
content = content.replace('jsonStr(cd, sizeof(cd), req.completionDate);', 'jsonStr(cd, sizeof(cd), req.completedAt);')
content = content.replace('req.vehicleId, req.operatorId, req.quantity,', 'req.vehicleId, 0 /* operatorId */, req.weightKg,')

# Fix handleGetDashboard
content = content.replace('req.status == COLLECTION_PENDING', 'req.status == COLLECTION_REQUESTED')

# Fix handleProcessCollection (just comment it out or include a mock since it's Phase 1)
content = content.replace('processNextCollection();', '// processNextCollection();')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated server.c for Phase 1 compilation.")
