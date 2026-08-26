import re

with open("include/types.h", "r", encoding="utf-8") as f:
    content = f.read()

# Replace struct names with V10
targets = [
    "User", "Resident", "Waste", "Bin", "Vehicle", "CollectionRequest", "Incident",
    "LocalHub", "WasteTransfer", "TransportFacility", "RecyclingBatch",
    "GeoLocation", "ServiceArea", "VehicleLocation", "RouteRequest", "Route",
    "VehicleInspection", "QREvent", "Alert", "RoutePlan", "AuditLog"
]

for target in targets:
    # Find the struct definition ending with '} Target;'
    pattern = r'(\}\s*)(' + target + r')(\s*;)'
    content = re.sub(pattern, r'\1\2_v10\3', content)

# Change the include guard
content = content.replace("TYPES_H", "TYPES_V10_H")

with open("include/types_v10.h", "w", encoding="utf-8") as f:
    f.write(content)
print("types_v10.h generated.")
