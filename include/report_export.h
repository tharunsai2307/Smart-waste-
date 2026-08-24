#ifndef REPORT_EXPORT_H
#define REPORT_EXPORT_H

#include "analytics.h"

// Generates CSV content into outBuffer up to maxBufferLen bytes.
// Returns actual bytes written or -1 on error.
int exportCollectionReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportHubInventoryReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportFleetReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportRouteReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportRecyclingReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportIncidentReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);
int exportWasteStreamReportCSV(const AnalyticsFilter* filter, char* outBuffer, int maxBufferLen);

#endif // REPORT_EXPORT_H
