// templates/scheduler-templates.ts
// Structural-template directives the consumer projects into <dl-scheduler> to override
// built-in rendering. Each captures a TemplateRef the shell hands to the relevant view/popup.
// They are inert by themselves (no DOM) — pure capture points. Tree-shakeable.

import { Directive, TemplateRef, inject } from '@angular/core';
import { SchedulerEvent } from '../core/models';

/** Context passed to a quick-view template override. */
export interface QuickViewContext<D = unknown> {
  /** The activated event. */
  $implicit: SchedulerEvent<D>;
  /** Call to dismiss the popover. */
  close: () => void;
  /** Emit an edit request to the host (so it can open its own form). */
  edit: () => void;
  /** Emit a delete request to the host. */
  delete: () => void;
}

/**
 * Override the default event quick-view popover.
 *   <ng-template ngsQuickViewTemplate let-event let-close="close" let-edit="edit">…</ng-template>
 */
// The `ngs` prefix is the library's intentional template-directive namespace (plan §7),
// distinct from the component (`dl-`) prefix — so the attribute-prefix lint rule is waived here.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[ngsQuickViewTemplate]', standalone: true })
export class QuickViewTemplateDirective<D = unknown> {
  readonly template = inject<TemplateRef<QuickViewContext<D>>>(TemplateRef);
  /** Type-narrowing guard for the template context (Angular language service). */
  static ngTemplateContextGuard<D>(
    _dir: QuickViewTemplateDirective<D>, _ctx: unknown,
  ): _ctx is QuickViewContext<D> { return true; }
}
