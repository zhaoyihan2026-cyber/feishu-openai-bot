# Agency Daily Report BI Design

## Goal

Turn the imported agency daily report format into a usable BI workflow that feels closer to AppsFlyer and Adjust: import a daily CSV, save it as the active dataset, and immediately analyze acquisition, funnel, monetization, cost, and retention metrics by date, media, and country.

## Supported Report Fields

The BI should recognize and preserve these columns:

- 日期
- 媒体
- 国家
- 消耗
- D0 ROAS
- ARPPU
- 付费率
- IR
- CTR
- CVR
- 安装注册率
- CPM
- CPC
- IPM
- CPI
- CPR
- CPP
- 展示次数
- 点击次数
- 安装人数
- 注册人数
- 付费人数
- 付费价值
- D1留存率
- D7留存率
- 单选

## Data Model

Extend the acquisition record model with optional report metrics:

- `d0Roas`
- `arppu`
- `paymentRate`
- `installRate`
- `ctr`
- `cvr`
- `installRegistrationRate`
- `cpm`
- `cpc`
- `ipm`
- `cpi`
- `cpr`
- `cpp`
- `d1RetentionRate`
- `d7RetentionRate`
- `selected`

The existing core fields remain the source of broad BI compatibility: spend, impressions, clicks, installs, registrations, payers, and paid value. Imported report metrics should be used when present. If a ratio metric is missing, aggregate views can derive it from the core fields.

## Import Behavior

The import flow should:

- Parse percent fields such as `16.23%` as `0.1623`.
- Parse currency fields such as `$1,303.0` as `1303`.
- Continue supporting month-day dates like `04-01` by inferring the year from the file name.
- Allow missing campaign, ad group, and creative columns.
- Show the newly supported fields in field recognition.
- Save the imported file as the active dataset only after the user clicks the save action.
- After save, automatically set the global date range to the imported dataset range and clear other filters.

## Overview Page

The overview should add a report-style metric surface:

- Spend
- Installs
- Registrations
- Payers
- Paid value
- D0 ROAS
- CPI
- CPR
- CPP
- D1 retention
- D7 retention

It should also expose a funnel from impressions to clicks to installs to registrations to payers, plus daily trends for spend, installs, paid value, D0 ROAS, and D7 retention.

## Performance Analysis Page

The performance table should support a daily-report view with columns:

- Media
- Country
- Spend
- Impressions
- Clicks
- Installs
- Registrations
- Payers
- Paid value
- CTR
- CVR
- CPI
- CPR
- CPP
- D0 ROAS
- D1 retention
- D7 retention

The existing dimension workflow remains: users can analyze by media, country, and date. Rows should aggregate metrics correctly rather than averaging row-level ratios blindly.

## Aggregation Rules

For grouped data:

- Sum count and money fields: spend, impressions, clicks, installs, registrations, payers, paid value.
- Derive rates from aggregate totals where possible:
  - CTR = clicks / impressions
  - CVR = installs / clicks
  - install registration rate = registrations / installs
  - payer rate = payers / installs
  - D0 ROAS = paid value / spend
  - ARPPU = paid value / payers
  - CPM = spend / impressions * 1000
  - CPC = spend / clicks
  - IPM = installs / impressions * 1000
  - CPI = spend / installs
  - CPR = spend / registrations
  - CPP = spend / payers
- For retention fields, use weighted averages when a useful denominator exists. For this phase, weight D1 and D7 retention by installs.

## Testing

Add tests for:

- Header mapping for all daily report columns.
- Percent and currency parsing.
- Record validation preserving all optional report metrics.
- Aggregate report metrics using totals and weighted retention.
- Data management save action updating filters to imported data range.
- Dashboard and performance presentation rendering the new metrics.

## Out Of Scope

This phase does not implement live AppsFlyer or Adjust API ingestion, attribution windows, raw event exports, cohort retention tables, SKAN, or server-side multi-user storage. The goal is a local-import BI workflow that can later accept platform data through the same model.
