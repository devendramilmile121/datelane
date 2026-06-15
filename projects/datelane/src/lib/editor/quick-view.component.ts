// editor/quick-view.component.ts
// The default event quick-view popover. Deliberately NOT an editor: it shows read-only event
// detail and surfaces Edit / Delete actions that the shell forwards to the host as outputs —
// the host opens its own form. Consumers can replace this entirely via [template]
// (ngsQuickViewTemplate). Positioned at an anchor point; dismiss on outside-click / Esc.

import {
  Component, input, output, inject, ElementRef, TemplateRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { QuickViewContext } from '../templates/scheduler-templates';
import { SCHEDULER_MESSAGES } from '../i18n/messages';

@Component({
  selector: 'dl-quick-view',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:keydown.escape)': 'onEsc()',
    '(document:pointerdown)': 'onOutside($event)',
  },
  template: `
    <div class="dl-qv" role="dialog" aria-modal="false" [attr.aria-label]="event().subject"
         [style.--dl-qv-x.px]="x()" [style.--dl-qv-y.px]="y()"
         [style.--dl-event-accent]="event().color || null">
      @if (template(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="context"></ng-container>
      } @else {
        <div class="dl-qv__bar" aria-hidden="true"></div>
        <button type="button" class="dl-qv__close" [attr.aria-label]="msgs.close" (click)="dismiss.emit()">×</button>
        <h3 class="dl-qv__title">{{ event().subject }}</h3>
        <p class="dl-qv__when">{{ whenLabel }}</p>
        @if (location) { <p class="dl-qv__meta">📍 {{ location }}</p> }
        @if (description) { <p class="dl-qv__desc">{{ description }}</p> }
        @if (!readonly()) {
          <div class="dl-qv__actions">
            <button type="button" class="dl-qv__btn dl-qv__btn--edit" (click)="edit.emit()">{{ msgs.edit }}</button>
            <button type="button" class="dl-qv__btn dl-qv__btn--del" (click)="delete.emit()">{{ msgs.delete }}</button>
          </div>
        }
      }
    </div>
  `,
})
export class QuickViewComponent {
  readonly event = input.required<SchedulerEvent<unknown>>();
  readonly x = input(0);
  readonly y = input(0);
  readonly readonly = input(false);
  /** Host override template; when set, replaces the entire default body. */
  readonly template = input<TemplateRef<QuickViewContext> | null>(null);

  readonly dismiss = output<void>();
  readonly edit = output<void>();
  readonly delete = output<void>();

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  protected readonly msgs = inject(SCHEDULER_MESSAGES);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Context object handed to a host override template. */
  get context(): QuickViewContext {
    return {
      $implicit: this.event(),
      close: () => this.dismiss.emit(),
      edit: () => this.edit.emit(),
      delete: () => this.delete.emit(),
    };
  }

  get whenLabel(): string {
    const e = this.event();
    if (e.isAllDay) return `${this.adapter.format(e.start, 'EEE, MMM d')} · ${this.msgs.allDay}`;
    return `${this.adapter.format(e.start, 'EEE, MMM d')} · `
      + `${this.adapter.format(e.start, 'hm')} – ${this.adapter.format(e.end, 'hm')}`;
  }
  get location(): string | undefined {
    return this.event().raw?.['location'] as string | undefined;
  }
  get description(): string | undefined {
    return this.event().raw?.['description'] as string | undefined;
  }

  onEsc(): void { this.dismiss.emit(); }

  onOutside(ev: PointerEvent): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) this.dismiss.emit();
  }
}
