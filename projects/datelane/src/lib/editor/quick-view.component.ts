// editor/quick-view.component.ts
// The default event quick-view popover. Deliberately NOT an editor: it shows read-only event
// detail and surfaces Edit / Delete actions that the shell forwards to the host as outputs —
// the host opens its own form. Consumers can replace this entirely via [template]
// (ngsQuickViewTemplate). Positioned at an anchor point; dismiss on outside-click / Esc.

import {
  Component, Input, Output, EventEmitter, Inject, HostListener, ElementRef,
  TemplateRef, ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import { QuickViewContext } from '../templates/scheduler-templates';

@Component({
  selector: 'dl-quick-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-qv" role="dialog" aria-modal="false" [attr.aria-label]="event.subject"
         [style.inset-inline-start.px]="x" [style.top.px]="y"
         [style.--dl-event-accent]="event.color || null">
      @if (template) {
        <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="context"></ng-container>
      } @else {
        <div class="dl-qv__bar" aria-hidden="true"></div>
        <button type="button" class="dl-qv__close" aria-label="Close" (click)="dismiss.emit()">×</button>
        <h3 class="dl-qv__title">{{ event.subject }}</h3>
        <p class="dl-qv__when">{{ whenLabel }}</p>
        @if (location) { <p class="dl-qv__meta">📍 {{ location }}</p> }
        @if (description) { <p class="dl-qv__desc">{{ description }}</p> }
        @if (!readonly) {
          <div class="dl-qv__actions">
            <button type="button" class="dl-qv__btn dl-qv__btn--edit" (click)="edit.emit()">Edit</button>
            <button type="button" class="dl-qv__btn dl-qv__btn--del" (click)="delete.emit()">Delete</button>
          </div>
        }
      }
    </div>
  `,
})
export class QuickViewComponent {
  @Input({ required: true }) event!: SchedulerEvent<unknown>;
  @Input() x = 0;
  @Input() y = 0;
  @Input() readonly = false;
  /** Host override template; when set, replaces the entire default body. */
  @Input() template: TemplateRef<QuickViewContext> | null = null;

  @Output() dismiss = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  constructor(
    @Inject(SCHEDULER_DATE_ADAPTER) public adapter: DateAdapter,
    private host: ElementRef<HTMLElement>,
  ) {}

  /** Context object handed to a host override template. */
  get context(): QuickViewContext {
    return {
      $implicit: this.event,
      close: () => this.dismiss.emit(),
      edit: () => this.edit.emit(),
      delete: () => this.delete.emit(),
    };
  }

  get whenLabel(): string {
    const e = this.event;
    if (e.isAllDay) return `${this.adapter.format(e.start, 'EEE, MMM d')} · All day`;
    return `${this.adapter.format(e.start, 'EEE, MMM d')} · `
      + `${this.adapter.format(e.start, 'hm')} – ${this.adapter.format(e.end, 'hm')}`;
  }
  get location(): string | undefined {
    return this.event.raw?.['location'] as string | undefined;
  }
  get description(): string | undefined {
    return this.event.raw?.['description'] as string | undefined;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.dismiss.emit(); }

  @HostListener('document:pointerdown', ['$event'])
  onOutside(ev: PointerEvent): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) this.dismiss.emit();
  }
}
