# Tradeoffs

## Android widget technology

The assignment allowed `Jetpack Glance` or `RemoteViews`. The current implementation uses `RemoteViews` because it is direct, dependable, and easier to validate quickly in a greenfield setup.

Tradeoff:

- faster integration now
- less expressive than a full Glance-based widget architecture

## Suggestion engine

The engine is rule-based rather than ML-based.

Tradeoff:

- deterministic and easy to explain
- ideal for a 72-hour assignment
- less adaptive than a learned ranking model

## Cross-app data limits

iOS platform limits mean the implementation cannot mirror Android for:

- installed app enumeration
- broad app usage patterns
- some music history patterns

Tradeoff:

- honest platform-specific support
- strong privacy alignment
- asymmetric capability across platforms

## Testing depth

Current tests focus on:

- pure intelligence logic
- payload derivation
- bridge contract behavior from the JS side

Tradeoff:

- strong confidence in shared business logic
- lighter native UI automation coverage than a production app
