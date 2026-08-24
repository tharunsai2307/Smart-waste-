# Municipal Analytics & Operational Intelligence Formulas

This document provides the exact mathematical formulas, aggregation logic, and scoring criteria implemented in Phase 9 of the Smart Waste Management Platform. All calculations are strictly derived from real persisted data records across Phases 1 through 8.

---

## 1. Municipal Operational Efficiency Index (MOEI)

The **Municipal Operational Efficiency Index (MOEI)** is a composite score (0–100%) reflecting overall city-wide waste management performance across 7 operational pillars.

$$\text{MOEI} = \sum_{i=1}^{7} (w_i \times S_i)$$

Where $\sum w_i = 1.0$ and each sub-score $S_i \in [0, 100]$:

| Pillar | Metric Description | Sub-Score Formula ($S_i$) | Weight ($w_i$) |
| :--- | :--- | :--- | :---: |
| **1. Collection Completion** | Success rate of household requests | $\frac{\text{Completed Collections}}{\text{Total Collections} - \text{Cancelled}} \times 100$ | 0.20 (20%) |
| **2. Hub Capacity Health** | Prevention of overflow across hubs | $100 - \max(0, \text{Avg Hub Utilization} - 80) \times 5$ (penalty above 80%) | 0.15 (15%) |
| **3. Route Execution** | Proportion of planned routes completed | $\frac{\text{Completed Routes}}{\max(1, \text{Dispatched Routes})} \times 100$ | 0.15 (15%) |
| **4. Fleet Availability** | Working vehicles ready vs maintenance | $\frac{\text{Active} + \text{Available Vehicles}}{\text{Total Fleet Size}} \times 100$ | 0.15 (15%) |
| **5. QR Compliance** | Authenticated scan success rate | $\frac{\text{Successful QR Scans}}{\max(1, \text{Total QR Scans})} \times 100$ | 0.10 (10%) |
| **6. Recycling Recovery** | Proportion of processed waste recovered | $\frac{\text{Total Recovered (kg)}}{\max(1, \text{Total Processed (kg)})} \times 100$ | 0.15 (15%) |
| **7. Incident Resolution** | Resolution rate of raised incidents | $\frac{\text{Resolved Incidents}}{\max(1, \text{Total Incidents})} \times 100$ | 0.10 (10%) |

*Note: If a category has 0 denominator (e.g. no routes created yet), its default sub-score is 100.0% so uninitiated systems do not penalize baseline efficiency.*

---

## 2. Driver Performance Score (DPS)

The **Driver Performance Score** (0–100) measures driver operational discipline, schedule adherence, and data integrity:

$$\text{DPS} = 40 \times R_{\text{comp}} + 25 \times S_{\text{comp}} + 15 \times Q_{\text{comp}} + 10 \times I_{\text{pass}} - 10 \times V_{\text{pen}} - 5 \times N_{\text{inc}}$$

Where:
- $R_{\text{comp}} = \frac{\text{Completed Routes}}{\max(1, \text{Assigned Routes})}$
- $S_{\text{comp}} = \frac{\text{Completed Stops}}{\max(1, \text{Total Stops in Assigned Routes})}$
- $Q_{\text{comp}} = \frac{\text{Successful Driver QR Scans}}{\max(1, \text{Total Driver QR Scans})}$
- $I_{\text{pass}} = \frac{\text{Passed Inspections}}{\max(1, \text{Total Inspections})}$
- $V_{\text{pen}} = \min(1.0, \frac{\text{Weight Variance Incidents}}{\max(1, \text{Completed Stops})})$ (Variance penalty)
- $N_{\text{inc}} = \min(4, \text{Driver-caused Incidents})$ (Max 20 point penalty)

The resulting score is clamped to $[0, 100]$.

---

## 3. Cleaner Performance Score (CPS)

The **Cleaner Performance Score** (0–100) reflects field collection execution:

$$\text{CPS} = 50 \times \left(\frac{\text{Completed Requests}}{\max(1, \text{Assigned Requests})}\right) + 30 \times \left(\frac{\text{Successful Deposits}}{\max(1, \text{Total Deposits})}\right) + 20 \times \left(1.0 - \frac{\text{Missed Collections}}{\max(1, \text{Assigned Requests})}\right)$$

Clamped to $[0, 100]$.

---

## 4. Recycling Mass Balance & Recovery Rates

Mass balance is validated at the batch and facility level according to the conservation of mass:

$$\text{Total Input (kg)} = \text{Recovered (kg)} + \text{Residual (kg)} + \text{Processing Loss (kg)}$$

### Recovery Rate:
$$\text{Recovery Rate (\%)} = \frac{\text{Total Recovered (kg)}}{\text{Total Processed (kg)}} \times 100$$

### Residual Rate:
$$\text{Residual Rate (\%)} = \frac{\text{Total Residual (kg)}}{\text{Total Processed (kg)}} \times 100$$

### Processing Loss Rate:
$$\text{Processing Loss (\%)} = \max\left(0, 100 - (\text{Recovery Rate} + \text{Residual Rate})\right)$$

---

## 5. Hub Capacity & Utilization

For each Local Collection Hub $h$:

$$\text{Current Inventory (kg)} = \sum \text{Inbound Transactions (kg)} - \sum \text{Outbound Transactions (kg)}$$

$$\text{Utilization Percentage (\%)} = \frac{\text{Current Inventory (kg)}}{\text{Maximum Capacity (kg)}} \times 100$$

$$\text{Available Capacity (kg)} = \max(0, \text{Maximum Capacity (kg)} - \text{Current Inventory (kg)})$$

### Health Status Classification:
- **NORMAL**: $\text{Utilization} < 70\%$
- **WARNING**: $70\% \le \text{Utilization} < 90\%$
- **CRITICAL**: $90\% \le \text{Utilization} < 100\%$
- **AT_CAPACITY**: $\text{Utilization} \ge 100\%$
- **TEMPORARILY_CLOSED**: Set if `isOperational == 0`

---

## 6. Weight Variance Detection & Accuracy Index

At collection stops, transfers, and receiving:

$$\text{Variance (kg)} = \text{Actual Weight} - \text{Estimated Weight}$$

$$\text{Variance (\%)} = \frac{|\text{Actual Weight} - \text{Estimated Weight}|}{\max(0.01, \text{Estimated Weight})} \times 100$$

If $\text{Variance (\%)} > \text{LOAD\_VARIANCE\_THRESHOLD\_PCT}$ (default 10%), an automatic `WEIGHT_VARIANCE` incident is recorded.

$$\text{Weight Measurement Accuracy Index (\%)} = \max\left(0, 100 - \text{Average Variance (\%)}\right)$$

---

## 7. QR Verification Compliance Rate

$$\text{Compliance Rate (\%)} = \frac{\text{Successful Scans}}{\max(1, \text{Total Scans})} \times 100$$

$$\text{Failure Rate (\%)} = 100 - \text{Compliance Rate}$$
