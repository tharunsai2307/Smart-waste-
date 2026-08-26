import re

with open("include/types.h", "r", encoding="utf-8") as f:
    content = f.read()

# Structs to inject workspaceId
targets = [
    "User", "Resident", "Waste", "Bin", "Vehicle", "CollectionRequest", "Incident",
    "LocalHub", "WasteTransfer", "TransportFacility", "RecyclingBatch",
    "GeoLocation", "ServiceArea", "VehicleLocation", "RouteRequest", "Route",
    "VehicleInspection", "QREvent", "Alert", "RoutePlan", "AuditLog"
]

for target in targets:
    # Find the struct definition
    pattern = r'(typedef\s+struct\s*\{[^}]*?)(\}\s*' + target + r'\s*;)'
    
    def replacer(match):
        inner = match.group(1)
        if "char workspaceId[37];" not in inner:
            return inner + "    char workspaceId[37];\n" + match.group(2)
        return match.group(0)

    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open("include/types.h", "w", encoding="utf-8") as f:
    f.write(content)

# Now generate types_v10.h from the original (we can just run git show HEAD:include/types.h)
