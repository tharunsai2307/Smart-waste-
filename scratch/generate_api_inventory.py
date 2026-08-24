import os
import re

frontend_src = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\frontend\src"
output_file = r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\reports\api_contract_inventory.md"

api_calls = []

# Simple regex to find fetch calls with their endpoints and methods
# Looking for patterns like fetch(`/api/collections/resident?id=${residentId}` or fetch('/api/hubs', { method: 'POST'
for root, _, files in os.walk(frontend_src):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find lines with /api/
            for i, line in enumerate(content.split('\n')):
                if '/api/' in line:
                    method = "GET"
                    if "method: 'POST'" in line or 'method: "POST"' in line: method = "POST"
                    if "method: 'PUT'" in line or 'method: "PUT"' in line: method = "PUT"
                    
                    # Extract the URL part
                    m = re.search(r"['\"`](/api/[^'\"`\?]+)", line)
                    url = m.group(1) if m else "UNKNOWN"
                    
                    if url != "UNKNOWN":
                        api_calls.append({
                            'url': url,
                            'method': method,
                            'file': os.path.relpath(filepath, frontend_src),
                            'line': i + 1
                        })

with open(output_file, 'w', encoding='utf-8') as out:
    out.write("# Frontend API Contract Inventory\n\n")
    
    # Group by endpoint
    endpoints = {}
    for call in api_calls:
        key = f"{call['method']} {call['url']}"
        if key not in endpoints:
            endpoints[key] = []
        endpoints[key].append(call['file'])
        
    for key in sorted(endpoints.keys()):
        files = list(set(endpoints[key]))
        out.write(f"### {key}\n")
        out.write(f"- **Frontend Pages:** {', '.join(files)}\n")
        out.write("- **Expected Role:** Context-dependent\n\n")

print(f"API Inventory saved to {output_file}")
