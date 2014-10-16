# Release Notes

## Development

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v4.0.2...master)

## v4.0.2 - October 16th, 2014
- Protect from undefined values on Phoenix object - 6132a2d

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v4.0.1...v4.0.2)

## v4.0.1 - June 9th, 2014
- Import hula-hoop lib - 84684d3

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v4.0.0...v4.0.1)

## v4.0.0 - June 9th, 2014
- Use hapi-routes from hula-hoop - 7cb3919

Compatibility notes:
- hapi-route default libraries and plugins are no longer automatically included after this change. Users will need to specify them explicitly. Ex:

```
  libraries: [
    __dirname + '/node_modules/phoenix-build/mixin'
  ],
  plugins: [
    {path: __dirname + '/node_modules/phoenix-build/node_modules/lumbar-long-expires'}
  ]
```

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v3.1.2...v4.0.0)

## v3.1.2 - March 5th, 2014
- Avoid using chai if not defined - fbba0b9

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v3.1.1...v3.1.2)

## v3.1.1 - March 4th, 2014
- Defer test exec to avoid IE10 $.ready bug - 116fb8e

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v3.1.0...v3.1.1)

## v3.1.0 - March 4th, 2014
- Update test mixin for latest sauce labs API - f99a571

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v3.0.0...v3.1.0)

## v3.0.0 - February 10th, 2014
- Update hapi routes to include module exec info - 439d236
- Update to lumbar 3.x - fbf2eb9
- Provide nextTick stub for tests - dbdb515

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.7.2...v3.0.0)

## v2.7.2 - December 31st, 2013
- Allow failover for explicitly passed fragment - 24dbac5

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.7.1...v2.7.2)

## v2.7.1 - December 24th, 2013
- Fix lumbar module reference - 256b206

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.7.0...v2.7.1)

## v2.7.0 - December 19th, 2013
- Implement phoenix-build lumbar task - c8c8017

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.6.0...v2.7.0)

## v2.6.0 - December 17th, 2013
- Implement hapi-routes grunt task - 6d5f90c

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.5.1...v2.6.0)

## v2.5.1 - December 12th, 2013

- Protect from missing clock case - b0447aa

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.5.0...v2.5.1)

## v2.5.0 - December 5th, 2013

- Upgrade to lumbar 2.5 - bf3c120

Compatibility notes:
- lumbar 2.5 uses stylus 0.41 and nib 1.0, which have breaking changes.

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.4.2...v2.5.0)

## v2.4.2 - December 3rd, 2013

- Fix formatting of test UI - 93b811b
- Remove backbone requirement from test runner - c85751c
- Remove $ requirement from test runner - 73c2359

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.4.1...v2.4.2)

## v2.4.1 - November 19th, 2013

- Update long expires dependency - fab5a3a

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.4.0...v2.4.1)

## v2.4.0 - November 6th, 2013

- Remove useServer conditional - 7424cd6
- Update lumbar dependency to 2.4 - 7fb98ac

Compatibility notes:
- The `useServer` conditional has been dropped in favor of the `server` config flag that lumbar now implements.

[Commits](https://github.com/walmartlabs/phoenix-build/compare/v2.3.4...v2.4.0)
