// public-api.ts — core entry point surface. Keep tree-shakeable (no side effects).

export * from './lib/core/models';
export * from './lib/core/providers';
export * from './lib/date-adapter/date-adapter';
export * from './lib/date-adapter/native-date-adapter';
export * from './lib/views/view-factories';
export * from './lib/views/vertical-time-view.component';
export * from './lib/views/month-view.component';
export * from './lib/engine/vertical-time-layout';
export * from './lib/engine/month-layout';
export * from './lib/engine/normalize-events';
export * from './lib/scheduler/scheduler.component';
// NgModule compatibility wrapper for Angular 9–13 consumers:
export * from './lib/scheduler/scheduler.module';
