import re

def silence_warning(filepath, func_sig, var_name):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if f"(void){var_name};" not in content:
        content = content.replace(func_sig + " {", func_sig + " {\n    (void)" + var_name + ";")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\location.c", "int assignHubForResident(int residentId, double lat, double lon)", "residentId")
silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\qr.c", "QREventResult validateQRCode(const char* qrCode, int routeId, int vehicleId, int driverId, int locationId, char* failureReason)", "routeId;\n    (void)driverId")
silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\recycling.c", "int receiveTransferAtFacility(int transferId, int facilityId, int operatorId)", "operatorId")
silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\recycling.c", "int recordReceivedWeight(int transferId, float receivedWeightKg, const char* measurementSource, int operatorId, float varianceThresholdPct)", "measurementSource")
silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\recycling.c", "int processTransferDecision(int transferId, const char* decision, const char* reason, int operatorId)", "operatorId")
silence_warning(r"C:\Users\Hp\.gemini\antigravity-ide\scratch\smart-waste-management\src\recycling.c", "int completeRecyclingBatch(int batchId, int operatorId)", "operatorId")
print("Silenced unused parameter warnings")
