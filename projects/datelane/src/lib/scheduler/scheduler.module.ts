// scheduler/scheduler.module.ts — compatibility surface for non-standalone (Angular 9–13) apps.
// Standalone components can be imported by NgModules; this just bundles them + default providers.

import { NgModule, ModuleWithProviders, Provider } from '@angular/core';
import { SchedulerComponent } from './scheduler.component';
import { QuickViewTemplateDirective } from '../templates/scheduler-templates';
import { provideNativeDateAdapter } from '../core/providers';

@NgModule({
  imports: [SchedulerComponent, QuickViewTemplateDirective],
  exports: [SchedulerComponent, QuickViewTemplateDirective],
})
export class SchedulerModule {
  /** Use in a root module: SchedulerModule.forRoot(provideLuxonDateAdapter()) */
  static forRoot(...providers: Provider[]): ModuleWithProviders<SchedulerModule> {
    return {
      ngModule: SchedulerModule,
      providers: providers.length ? providers : [provideNativeDateAdapter()],
    };
  }
}
