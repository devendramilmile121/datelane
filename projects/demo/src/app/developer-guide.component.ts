import { Component, ElementRef, OnDestroy, afterNextRender, computed, inject, signal } from '@angular/core';
import { SchedulerComponent, dayView, weekView, type FieldMap, type SchedulerViewType } from '@datelane/core';

/**
 * Static developer documentation for @datelane/core.
 * Code samples live as string fields and are rendered through interpolation
 * inside <pre>, so Angular escapes the markup and `{{ }}` never collides with
 * the template compiler.
 */
@Component({
  standalone: true,
  selector: 'app-developer-guide',
  imports: [SchedulerComponent],
  styles: [`
    :host {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 32px;
      align-items: start;
      font: 14px/1.6 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: #1f2730;
    }
    @media (max-width: 860px) { :host { grid-template-columns: 1fr; } .toc { display: none; } }

    .toc {
      position: sticky; top: 16px; align-self: start;
      font-size: 13px; line-height: 1.9;
      border-inline-start: 2px solid #eef0f3; padding-inline-start: 14px;
    }
    .toc a {
      color: #5b6470; text-decoration: none; display: block;
      padding-inline-start: 8px; margin-inline-start: -16px;
      border-inline-start: 2px solid transparent;
    }
    .toc a:hover { color: #2563eb; }
    .toc a.active {
      color: #2563eb; font-weight: 600;
      border-inline-start-color: #2563eb;
    }
    .toc .grp { font-weight: 600; color: #1f2730; margin-top: 10px; }

    .content { max-width: 860px; min-width: 0; }
    .content h2 {
      font-size: 22px; font-weight: 600; margin: 40px 0 8px;
      padding-top: 8px; scroll-margin-top: 16px;
    }
    .content h2:first-child { margin-top: 0; }
    .content h3 { font-size: 16px; font-weight: 600; margin: 24px 0 6px; }
    .content p { margin: 8px 0; color: #2c343d; }
    .content ul { margin: 8px 0; padding-inline-start: 20px; }
    .content li { margin: 4px 0; }
    .content code {
      font: 12.5px 'SF Mono', ui-monospace, Menlo, monospace;
      background: #f3f4f6; padding: 1px 5px; border-radius: 4px; color: #b4267a;
    }

    pre {
      background: #0f1722; color: #e6edf3; border-radius: 8px;
      padding: 14px 16px; overflow-x: auto; margin: 12px 0;
      font: 12.5px/1.55 'SF Mono', ui-monospace, Menlo, monospace;
    }
    .content pre code { background: none; padding: 0; color: inherit; }

    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
    th, td { text-align: start; padding: 7px 10px; border-bottom: 1px solid #eceef1; vertical-align: top; }
    th { font-weight: 600; color: #1f2730; border-bottom: 2px solid #e2e5e9; }
    td code { background: #f3f4f6; color: #1f5fb4; white-space: nowrap; }
    td.t code { color: #0f766e; }

    .callout {
      border-inline-start: 3px solid #2563eb; background: #f5f8ff;
      padding: 10px 14px; border-radius: 0 6px 6px 0; margin: 14px 0;
      font-size: 13px; color: #344;
    }
    .pill {
      display: inline-block; font: 600 11px system-ui; text-transform: uppercase;
      letter-spacing: .04em; padding: 2px 7px; border-radius: 999px; margin-inline-end: 6px;
    }
    .pill.in { background: #e8f0fe; color: #1a56db; }
    .pill.out { background: #fdeaea; color: #c0392b; }
    .pill.two { background: #e9f7ef; color: #1e7e45; }

    /* ---- live theming playground ---- */
    .tp {
      border: 1px solid #e6e9ed; border-radius: 10px; overflow: hidden; margin: 14px 0;
    }
    .tp-controls {
      display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
      padding: 12px 14px; background: #fafbfc; border-bottom: 1px solid #eceef1;
    }
    .tp-controls label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: #5b6470; }
    .tp-controls input[type=color] {
      inline-size: 28px; block-size: 28px; padding: 0; border: 1px solid #cdd2d9;
      border-radius: 6px; background: none; cursor: pointer;
    }
    .tp-controls input[type=range] { inline-size: 96px; }
    .tp-controls .val { font: 600 12px 'SF Mono', ui-monospace, monospace; color: #1f2730; min-inline-size: 34px; }
    .tp-controls .toggle { cursor: pointer; }
    .tp-preview { padding: 14px; background: #fff; }
    .tp-code { position: relative; }
    .tp-code pre { margin: 0; border-radius: 0; }
    .tp-copy {
      position: absolute; inset-block-start: 10px; inset-inline-end: 10px;
      font: 500 11px system-ui; padding: 4px 10px; border: 1px solid #2c3a4d;
      border-radius: 6px; background: #1c2736; color: #cfe0f5; cursor: pointer;
    }
    .tp-copy:hover { background: #243246; }
  `],
  template: `
    <nav class="toc" aria-label="Table of contents">
      @for (g of toc; track g.label) {
        <div class="grp">{{ g.label }}</div>
        @for (item of g.items; track item.id) {
          <a [href]="'#' + item.id"
             [class.active]="activeId() === item.id"
             [attr.aria-current]="activeId() === item.id ? 'true' : null">
            {{ item.label }}
          </a>
        }
      }
    </nav>

    <article class="content">
      <!-- ========== OVERVIEW ========== -->
      <h2 id="overview">Overview</h2>
      <p>
        <code>&#64;datelane/core</code> is a lightweight, customizable Angular scheduler/calendar.
        It renders all 12 view modes (Day, Week, Month, Year, Agenda, Timeline…) from a single
        configurable engine, ships <strong>zero hard runtime dependencies</strong> (only
        <code>&#64;angular/*</code> peers), and is fully themeable through CSS custom properties.
      </p>
      <ul>
        <li><strong>Standalone-only, signal-first</strong> — Angular 18+ floor, no NgModule surface.</li>
        <li><strong>Pluggable date layer</strong> — Native (default, zero deps), Luxon, or Moment.</li>
        <li><strong>Controlled component</strong> — the library never mutates your data; it emits
          proposed changes and you feed updates back via <code>[events]</code>.</li>
        <li><strong>Tree-shakeable</strong> — views are factory functions; you only pay for what you import.</li>
        <li><strong>Accessible by default</strong> — roles, keyboard model, focus management, AA contrast.</li>
      </ul>

      <!-- ========== INSTALL ========== -->
      <h2 id="install">Install</h2>
      <pre><code>{{ s.install }}</code></pre>
      <p>Peer dependency range (declared by the package, not installed for you):</p>
      <pre><code>{{ s.peers }}</code></pre>
      <p>Import the stylesheet once (global styles, e.g. <code>styles.scss</code> or <code>angular.json</code>):</p>
      <pre><code>{{ s.styleImport }}</code></pre>

      <!-- ========== QUICK START ========== -->
      <h2 id="quickstart">Quick start</h2>
      <p>1&#41; Register the scheduler providers at bootstrap (defaults to the zero-dep Native adapter):</p>
      <pre><code>{{ s.bootstrap }}</code></pre>
      <p>2&#41; Drop the component into a standalone component, pass your data + a <code>FieldMap</code>:</p>
      <pre><code>{{ s.quickComponent }}</code></pre>
      <div class="callout">
        That is a complete working scheduler. The built-in header gives prev/next/today, a date-range
        label, and a view switcher driven by <code>[views]</code>.
      </div>

      <!-- ========== CONCEPTS ========== -->
      <h2 id="concepts">Core concepts</h2>
      <h3>Controlled component</h3>
      <p>
        Views never mutate <code>[events]</code>. When the user drags, resizes, or deletes, the
        scheduler emits a <code>SchedulerChange</code> with a <em>clone</em> carrying the proposed
        change — you apply it to your own data and feed it back. This keeps your store as the single
        source of truth.
      </p>
      <h3>Date adapter</h3>
      <p>
        All date math runs through an abstract <code>DateAdapter</code>. Core ships
        <code>NativeDateAdapter</code> (uses <code>Intl</code>, zero deps). Opt into Luxon or Moment
        via secondary entry points — see <a href="#adapters">Date adapters</a>.
      </p>
      <h3>View descriptors</h3>
      <p>
        Instead of per-view component tags, you pass an array of typed descriptors built by factory
        functions. Each descriptor configures one entry in the view switcher.
      </p>
      <pre><code>{{ s.views }}</code></pre>

      <!-- ========== VIEWS ========== -->
      <h2 id="views">The 12 views</h2>
      <p>Every view is a tree-shakeable factory. Import only the ones you use.</p>
      <table>
        <thead><tr><th>Factory</th><th>View type</th><th>Layout engine</th></tr></thead>
        <tbody>
          @for (v of viewRows; track v.fn) {
            <tr><td class="t"><code>{{ v.fn }}</code></td><td><code>{{ v.type }}</code></td><td>{{ v.engine }}</td></tr>
          }
        </tbody>
      </table>
      <div class="callout">
        Agenda &amp; Month-Agenda require a pixel <code>height</code> — set <code>height="600px"</code>.
      </div>

      <!-- ========== DESCRIPTOR ========== -->
      <h2 id="descriptor">View options (ViewDescriptor)</h2>
      <p>Pass any of these to a view factory, e.g. <code>weekView(&#123; firstDayOfWeek: 1 &#125;)</code>.</p>
      <table>
        <thead><tr><th>Option</th><th>Type</th><th>Applies to</th></tr></thead>
        <tbody>
          @for (o of descriptorRows; track o.name) {
            <tr><td class="t"><code>{{ o.name }}</code></td><td><code>{{ o.type }}</code></td><td>{{ o.applies }}</td></tr>
          }
        </tbody>
      </table>

      <!-- ========== INPUTS ========== -->
      <h2 id="inputs">Inputs</h2>
      <p><code>&lt;dl-scheduler&gt;</code> accepts these <span class="pill in">in</span> bindings:</p>
      <table>
        <thead><tr><th>Input</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          @for (i of inputRows; track i.name) {
            <tr><td class="t"><code>{{ i.name }}</code></td><td><code>{{ i.type }}</code></td><td><code>{{ i.def }}</code></td><td>{{ i.desc }}</td></tr>
          }
        </tbody>
      </table>

      <!-- ========== TWO-WAY ========== -->
      <h2 id="twoway">Two-way bindings</h2>
      <p>Both support the banana-in-a-box <code>[(...)]</code> syntax.</p>
      <table>
        <thead><tr><th>Model</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td class="t"><code>activeView</code></td><td><code>SchedulerViewType</code></td><td><span class="pill two">2-way</span>The currently shown view. Emits <code>activeViewChange</code>.</td></tr>
          <tr><td class="t"><code>viewDate</code></td><td><code>D</code> (adapter date)</td><td><span class="pill two">2-way</span>The navigated/selected date. Emits <code>viewDateChange</code>.</td></tr>
        </tbody>
      </table>
      <pre><code>{{ s.twoway }}</code></pre>

      <!-- ========== OUTPUTS ========== -->
      <h2 id="outputs">Outputs / events</h2>
      <p>All <span class="pill out">out</span> events. CRUD outputs carry a <code>SchedulerChange</code>; the host applies the change to its own data.</p>
      <table>
        <thead><tr><th>Output</th><th>Payload</th><th>Fires when</th></tr></thead>
        <tbody>
          @for (e of outputRows; track e.name) {
            <tr><td class="t"><code>{{ e.name }}</code></td><td><code>{{ e.payload }}</code></td><td>{{ e.when }}</td></tr>
          }
        </tbody>
      </table>
      <pre><code>{{ s.outputs }}</code></pre>
      <div class="callout">
        <code>eventEdit</code> exists because the library ships <em>no</em> editor form. The built-in
        quick-view's Edit button just emits <code>eventEdit</code> so <strong>you</strong> open your
        own form. <code>cellClick</code> works the same way for create.
      </div>

      <!-- ========== FIELDMAP ========== -->
      <h2 id="fieldmap">FieldMap — mapping your records</h2>
      <p>
        Your raw records can use any field names. <code>FieldMap</code> tells the scheduler which
        field is the subject, start, end, etc. Internally records normalize to a canonical
        <code>SchedulerEvent</code>.
      </p>
      <table>
        <thead><tr><th>Key</th><th>Required</th><th>Maps to</th></tr></thead>
        <tbody>
          @for (f of fieldMapRows; track f.key) {
            <tr><td class="t"><code>{{ f.key }}</code></td><td>{{ f.req }}</td><td>{{ f.maps }}</td></tr>
          }
        </tbody>
      </table>
      <pre><code>{{ s.fieldmap }}</code></pre>

      <!-- ========== RESOURCES ========== -->
      <h2 id="resources">Resources &amp; grouping</h2>
      <p>
        Resources (people, rooms, equipment) drive timeline rows and event colors. Define each
        resource set with a <code>ResourceDefinition</code>, then group via <code>[grouping]</code>.
      </p>
      <pre><code>{{ s.resources }}</code></pre>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Purpose</th></tr></thead>
        <tbody>
          @for (r of resourceRows; track r.name) {
            <tr><td class="t"><code>{{ r.name }}</code></td><td><code>{{ r.type }}</code></td><td>{{ r.purpose }}</td></tr>
          }
        </tbody>
      </table>

      <!-- ========== TYPES ========== -->
      <h2 id="types">Payload types</h2>
      <pre><code>{{ s.types }}</code></pre>

      <!-- ========== TEMPLATES ========== -->
      <h2 id="templates">Templates</h2>
      <p>
        Override the built-in quick-view popover with your own markup using the
        <code>ngsQuickViewTemplate</code> directive. The context exposes the event plus
        <code>close</code> and <code>edit</code> callbacks.
      </p>
      <pre><code>{{ s.templates }}</code></pre>

      <!-- ========== I18N ========== -->
      <h2 id="i18n">Internationalization</h2>
      <p>
        Localize the UI strings (Today, Previous, Next, +N more…) with
        <code>provideSchedulerI18n</code>. Date formatting follows the adapter locale.
      </p>
      <pre><code>{{ s.i18n }}</code></pre>

      <!-- ========== THEMING ========== -->
      <h2 id="theming">Theming</h2>
      <p>
        The entire color/type/spacing surface is CSS custom properties (<code>--dl-*</code>).
        Override them anywhere up the cascade — no <code>::ng-deep</code>, no fork. A single
        <code>--dl-accent</code> recolors selection, today, focus ring, and default events.
      </p>

      <h3>Try it — live theme builder</h3>
      <p>Tweak the tokens; the scheduler below re-skins instantly. Copy the generated CSS into your app.</p>
      <div class="tp">
        <div class="tp-controls">
          <label>Accent
            <input type="color" [value]="tAccent()" (input)="tAccent.set($any($event.target).value)" />
          </label>
          <label>Surface
            <input type="color" [value]="tBg()" (input)="tBg.set($any($event.target).value)" />
          </label>
          <label>Border
            <input type="color" [value]="tBorder()" (input)="tBorder.set($any($event.target).value)" />
          </label>
          <label>Radius
            <input type="range" min="0" max="16" [value]="tRadius()"
              (input)="tRadius.set(+$any($event.target).value)" />
            <span class="val">{{ tRadius() }}px</span>
          </label>
          <label>Slot
            <input type="range" min="32" max="72" [value]="tSlot()"
              (input)="tSlot.set(+$any($event.target).value)" />
            <span class="val">{{ tSlot() }}px</span>
          </label>
          <label class="toggle">
            <input type="checkbox" [checked]="tDark()" (change)="tDark.set($any($event.target).checked)" />
            Dark
          </label>
        </div>

        <div class="tp-preview">
          <dl-scheduler
            [style.--dl-accent]="tAccent()"
            [style.--dl-bg]="tBg()"
            [style.--dl-surface]="tBg()"
            [style.--dl-border]="tBorder()"
            [style.--dl-radius-md]="tRadius() + 'px'"
            [style.--dl-slot-h]="tSlot() + 'px'"
            [attr.data-dl-theme]="tDark() ? 'dark' : null"
            [(activeView)]="tView"
            [views]="tViews"
            [events]="tEvents"
            [fieldMap]="tFieldMap"
            [showQuickView]="false"
            height="320px">
          </dl-scheduler>
        </div>

        <div class="tp-code">
          <button type="button" class="tp-copy" (click)="copyTheme()">{{ copied() ? 'Copied!' : 'Copy CSS' }}</button>
          <pre><code>{{ generatedCss() }}</code></pre>
        </div>
      </div>

      <pre><code>{{ s.theming }}</code></pre>
      <p>Dark mode is a built-in token mapping toggled by an attribute:</p>
      <pre><code>{{ s.dark }}</code></pre>

      <!-- ========== ADAPTERS ========== -->
      <h2 id="adapters">Date adapters</h2>
      <p>Core uses the Native adapter by default. Swap in Luxon or Moment via secondary entry points:</p>
      <pre><code>{{ s.adapters }}</code></pre>

      <!-- ========== PROVIDERS & TOKENS ========== -->
      <h2 id="providers">Providers &amp; DI tokens</h2>
      <p>Functions you call in your <code>providers</code> array, and the injection tokens they set.</p>
      <table>
        <thead><tr><th>Symbol</th><th>Kind</th><th>Purpose</th></tr></thead>
        <tbody>
          @for (p of providerRows; track p.name) {
            <tr><td class="t"><code>{{ p.name }}</code></td><td>{{ p.kind }}</td><td>{{ p.purpose }}</td></tr>
          }
        </tbody>
      </table>
      <pre><code>{{ s.providers }}</code></pre>

      <!-- ========== DATE ADAPTER API ========== -->
      <h2 id="dateadapter">DateAdapter API</h2>
      <p>
        The abstract contract all date math runs through. Implement it to support any date library
        or calendar system; <code>NativeDateAdapter</code> is the built-in zero-dep implementation.
        <code>D</code> is the adapter's date type (e.g. <code>Date</code>, Luxon <code>DateTime</code>).
      </p>
      <table>
        <thead><tr><th>Method</th><th>Returns</th><th>Purpose</th></tr></thead>
        <tbody>
          @for (m of adapterRows; track m.sig) {
            <tr><td class="t"><code>{{ m.sig }}</code></td><td><code>{{ m.ret }}</code></td><td>{{ m.desc }}</td></tr>
          }
        </tbody>
      </table>
      <pre><code>{{ s.customAdapter }}</code></pre>

      <!-- ========== MODELS ========== -->
      <h2 id="models">Models &amp; interfaces</h2>
      <p>All exported types. The big ones (FieldMap, ViewDescriptor, SchedulerEvent…) are detailed in their own sections above.</p>
      <table>
        <thead><tr><th>Type</th><th>Shape / values</th></tr></thead>
        <tbody>
          @for (m of modelRows; track m.name) {
            <tr><td class="t"><code>{{ m.name }}</code></td><td><code>{{ m.shape }}</code></td></tr>
          }
        </tbody>
      </table>

      <!-- ========== ENGINE ========== -->
      <h2 id="engine">Engine layout API <span style="font-weight:400;font-size:14px;color:#7a828c">(advanced)</span></h2>
      <p>
        Framework-free pure functions that compute view geometry. You don't need these for normal
        use — the views call them internally — but they're exported for custom renderers, tests, or
        headless layout. Each returns a typed layout result.
      </p>
      <table>
        <thead><tr><th>Function</th><th>Returns</th><th>Used by</th></tr></thead>
        <tbody>
          @for (e of engineRows; track e.fn) {
            <tr><td class="t"><code>{{ e.fn }}</code></td><td><code>{{ e.ret }}</code></td><td>{{ e.used }}</td></tr>
          }
        </tbody>
      </table>
      <p>Supporting helpers: <code>normalizeEvents()</code>, <code>sortEvents()</code>, <code>countEventsOn()</code>, <code>parseHour()</code>, <code>engineFor()</code>, <code>buildTimelineRows()</code>, <code>buildTimelineColumns()</code>.</p>

      <!-- ========== INTERACTION ========== -->
      <h2 id="interaction">Gesture utilities <span style="font-weight:400;font-size:14px;color:#7a828c">(advanced)</span></h2>
      <p>Pure math used by drag/resize. Exported for custom interaction layers.</p>
      <table>
        <thead><tr><th>Symbol</th><th>Signature</th><th>Purpose</th></tr></thead>
        <tbody>
          @for (g of gestureRows; track g.name) {
            <tr><td class="t"><code>{{ g.name }}</code></td><td><code>{{ g.sig }}</code></td><td>{{ g.desc }}</td></tr>
          }
        </tbody>
      </table>

      <!-- ========== FULL EXPORT INDEX ========== -->
      <h2 id="exports">Full export index</h2>
      <p>Everything importable from <code>&#64;datelane/core</code>, grouped. Renderer components are exported but normally used internally by the shell.</p>
      <table>
        <thead><tr><th>Category</th><th>Exports</th></tr></thead>
        <tbody>
          @for (x of exportIndex; track x.cat) {
            <tr><td>{{ x.cat }}</td><td><code>{{ x.list }}</code></td></tr>
          }
        </tbody>
      </table>

      <!-- ========== SCRATCH TO PRO ========== -->
      <h2 id="scratch-to-pro">From scratch to pro</h2>
      <p>A suggested path once the quick start renders:</p>
      <ul>
        <li><strong>1. Render &amp; navigate</strong> — pass <code>[events]</code> + <code>[fieldMap]</code>, configure <code>[views]</code>, wire <code>[(activeView)]</code> / <code>[(viewDate)]</code>.</li>
        <li><strong>2. Make it controlled</strong> — handle <code>(eventChange)</code> / <code>(eventDelete)</code> and feed updated data back into <code>[events]</code>.</li>
        <li><strong>3. Own create/edit</strong> — open your form from <code>(cellClick)</code> and <code>(eventEdit)</code>; the library never ships a form.</li>
        <li><strong>4. Add resources</strong> — define <code>[resources]</code> + <code>[grouping]</code> to light up the timeline views.</li>
        <li><strong>5. Customize</strong> — project <code>ngsQuickViewTemplate</code>, localize via <code>provideSchedulerI18n</code>, theme with <code>--dl-*</code> tokens.</li>
        <li><strong>6. Go global</strong> — switch to the Luxon/Moment adapter for time-zone-aware rendering; set <code>dir="rtl"</code> for RTL layouts.</li>
      </ul>
      <div class="callout">
        Try every view live in the <strong>Playground</strong> tab — drag, resize, drill into days,
        and watch the controlled-update log.
      </div>
    </article>
  `,
})
export class DeveloperGuideComponent implements OnDestroy {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private observer?: IntersectionObserver;

  /** Currently in-view section id — drives the active TOC highlight. */
  readonly activeId = signal('overview');

  readonly toc = [
    { label: 'Get started', items: [
      { id: 'overview', label: 'Overview' },
      { id: 'install', label: 'Install' },
      { id: 'quickstart', label: 'Quick start' },
      { id: 'concepts', label: 'Core concepts' },
    ] },
    { label: 'Views', items: [
      { id: 'views', label: 'The 12 views' },
      { id: 'descriptor', label: 'View options' },
    ] },
    { label: 'Component API', items: [
      { id: 'inputs', label: 'Inputs' },
      { id: 'twoway', label: 'Two-way bindings' },
      { id: 'outputs', label: 'Outputs / events' },
    ] },
    { label: 'Data', items: [
      { id: 'fieldmap', label: 'FieldMap' },
      { id: 'resources', label: 'Resources & grouping' },
      { id: 'types', label: 'Payload types' },
    ] },
    { label: 'Customize', items: [
      { id: 'templates', label: 'Templates' },
      { id: 'i18n', label: 'i18n' },
      { id: 'theming', label: 'Theming' },
      { id: 'adapters', label: 'Date adapters' },
    ] },
    { label: 'Reference', items: [
      { id: 'providers', label: 'Providers & tokens' },
      { id: 'dateadapter', label: 'DateAdapter API' },
      { id: 'models', label: 'Models & interfaces' },
      { id: 'engine', label: 'Engine layout API' },
      { id: 'interaction', label: 'Gesture utilities' },
      { id: 'exports', label: 'Full export index' },
    ] },
    { label: 'Pro', items: [
      { id: 'scratch-to-pro', label: 'Scratch → pro' },
    ] },
  ];

  constructor() {
    afterNextRender(() => {
      const sections = Array.from(
        this.host.nativeElement.querySelectorAll<HTMLElement>('.content h2[id]'),
      );
      // Active = the last heading whose top has scrolled above the 30% line.
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) this.activeId.set(e.target.id);
          }
        },
        { rootMargin: '0px 0px -70% 0px', threshold: 0 },
      );
      sections.forEach((s) => this.observer!.observe(s));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // ---- live theme builder ----------------------------------------------------
  readonly tAccent = signal('#2563eb');
  readonly tBg = signal('#ffffff');
  readonly tBorder = signal('#e2e5e9');
  readonly tRadius = signal(6);
  readonly tSlot = signal(44);
  readonly tDark = signal(false);
  readonly copied = signal(false);

  readonly generatedCss = computed(() => {
    const sel = this.tDark() ? `.dl-scheduler[data-dl-theme="dark"]` : `.dl-scheduler`;
    return `${sel} {
  --dl-accent: ${this.tAccent()};
  --dl-bg: ${this.tBg()};
  --dl-surface: ${this.tBg()};
  --dl-border: ${this.tBorder()};
  --dl-radius-md: ${this.tRadius()}px;
  --dl-slot-h: ${this.tSlot()}px;
}`;
  });

  async copyTheme(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.generatedCss());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  tView: SchedulerViewType = 'week';
  readonly tViews = [dayView(), weekView({ isDefault: true, startHour: '08:00', endHour: '18:00' })];
  readonly tFieldMap: FieldMap = { id: 'id', subject: 'subject', start: 'start', end: 'end' };
  readonly tEvents = (() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - base.getDay() + 1); // Monday
    const ev = (day: number, h: number, m: number, dur: number, subject: string) => {
      const start = new Date(base); start.setDate(start.getDate() + day); start.setHours(h, m);
      const end = new Date(start); end.setMinutes(end.getMinutes() + dur);
      return { id: `${day}-${h}`, subject, start, end };
    };
    return [
      ev(0, 9, 0, 30, 'Standup'),
      ev(1, 11, 0, 90, 'Design review'),
      ev(2, 14, 0, 60, '1:1'),
      ev(3, 10, 0, 120, 'Workshop'),
    ];
  })();

  readonly viewRows = [
    { fn: 'dayView()', type: 'day', engine: 'vertical-time' },
    { fn: 'weekView()', type: 'week', engine: 'vertical-time' },
    { fn: 'workWeekView()', type: 'workWeek', engine: 'vertical-time' },
    { fn: 'monthView()', type: 'month', engine: 'calendar' },
    { fn: 'yearView()', type: 'year', engine: 'calendar' },
    { fn: 'agendaView()', type: 'agenda', engine: 'list' },
    { fn: 'monthAgendaView()', type: 'monthAgenda', engine: 'calendar + list' },
    { fn: 'timelineDayView()', type: 'timelineDay', engine: 'horizontal-time' },
    { fn: 'timelineWeekView()', type: 'timelineWeek', engine: 'horizontal-time' },
    { fn: 'timelineWorkWeekView()', type: 'timelineWorkWeek', engine: 'horizontal-time' },
    { fn: 'timelineMonthView()', type: 'timelineMonth', engine: 'horizontal-time' },
    { fn: 'timelineYearView()', type: 'timelineYear', engine: 'horizontal-time' },
  ];

  readonly descriptorRows = [
    { name: 'displayName', type: 'string', applies: 'all — custom switcher label' },
    { name: 'isDefault', type: 'boolean', applies: 'all — initial active view' },
    { name: 'interval', type: 'number', applies: 'day/week/month/timeline — extend count' },
    { name: 'dateFormat', type: 'string', applies: 'all' },
    { name: 'readonly', type: 'boolean', applies: 'all — block CRUD on that view' },
    { name: 'showWeekend', type: 'boolean', applies: 'all — hide weekends when false' },
    { name: 'showWeekNumber', type: 'boolean', applies: 'day/week/workWeek/month' },
    { name: 'workDays', type: 'number[]', applies: 'all except agenda (0=Sun…6=Sat)' },
    { name: 'firstDayOfWeek', type: 'number', applies: 'week-based views (0=Sun)' },
    { name: 'startHour', type: 'string "HH:mm"', applies: 'time-grid + timeline day/week' },
    { name: 'endHour', type: 'string "HH:mm"', applies: 'time-grid + timeline day/week' },
    { name: 'timeScale', type: '{ enabled; slotCount }', applies: 'time-grid + timeline day/week' },
    { name: 'orientation', type: "'horizontal'|'vertical'", applies: 'year, timelineYear' },
    { name: 'headerRows', type: 'HeaderRow[]', applies: 'timeline views' },
    { name: 'allowVirtualScrolling', type: 'boolean', applies: 'agenda, timeline views' },
    { name: 'grouping', type: 'GroupingConfig', applies: 'all (with resources)' },
  ];

  readonly inputRows = [
    { name: 'events', type: 'ReadonlyArray<Record>', def: '[]', desc: 'Your raw event records.' },
    { name: 'fieldMap', type: 'FieldMap', def: '—', desc: 'Maps record fields to canonical event shape.' },
    { name: 'views', type: 'ViewDescriptor[]', def: '[]', desc: 'Configured views (drives the switcher).' },
    { name: 'resources', type: 'ResourceDefinition[]', def: '[]', desc: 'Resource sets for timeline + colors.' },
    { name: 'grouping', type: 'GroupingConfig', def: '—', desc: 'How to group by resource(s).' },
    { name: 'readonly', type: 'boolean', def: 'false', desc: 'Disable all CRUD globally.' },
    { name: 'rowAutoHeight', type: 'boolean', def: 'false', desc: 'Timeline rows grow to fit events.' },
    { name: 'agendaDaysCount', type: 'number', def: '7', desc: 'Days shown in the Agenda view.' },
    { name: 'hideEmptyAgendaDays', type: 'boolean', def: 'false', desc: 'Skip days with no events.' },
    { name: 'showQuickView', type: 'boolean', def: 'true', desc: 'Show built-in quick-view popover.' },
    { name: 'autoScroll', type: 'boolean', def: 'true', desc: 'Scroll to first event on render/period change.' },
    { name: 'scrollHour', type: 'number', def: '—', desc: 'Scroll time-grid to this hour instead.' },
    { name: 'height', type: 'string', def: "'600px'", desc: 'Component block size (required for Agenda).' },
    { name: 'width', type: 'string', def: "'100%'", desc: 'Component inline size.' },
    { name: 'dir', type: "'ltr'|'rtl'", def: "'ltr'", desc: 'Layout direction (RTL mirrors automatically).' },
  ];

  readonly outputRows = [
    { name: 'eventCreate', payload: 'SchedulerChange', when: 'a new event is created.' },
    { name: 'eventChange', payload: 'SchedulerChange', when: 'an event is dragged or resized.' },
    { name: 'eventDelete', payload: 'SchedulerChange', when: 'an event is deleted.' },
    { name: 'eventEdit', payload: 'SchedulerChange', when: 'quick-view Edit is pressed (open your form).' },
    { name: 'eventClick', payload: 'SchedulerChange', when: 'an event is activated.' },
    { name: 'cellClick', payload: '{ date; resourceId? }', when: 'an empty cell/slot is clicked (open your create form).' },
    { name: 'navigate', payload: 'NavigateEvent', when: 'prev/next/today/date navigation occurs.' },
    { name: 'viewChange', payload: 'SchedulerViewType', when: 'the active view switches.' },
  ];

  readonly fieldMapRows = [
    { key: 'id', req: 'yes', maps: 'unique event id' },
    { key: 'subject', req: 'yes', maps: 'event title' },
    { key: 'start', req: 'yes', maps: 'start date/time' },
    { key: 'end', req: 'yes', maps: 'end date/time' },
    { key: 'isAllDay', req: 'no', maps: 'all-day boolean' },
    { key: 'recurrenceRule', req: 'no', maps: 'RFC 5545 RRULE string' },
    { key: 'recurrenceExceptions', req: 'no', maps: 'EXDATE list' },
    { key: 'resource', req: 'no', maps: 'resource id field (string or string[])' },
    { key: 'color', req: 'no', maps: 'event color override' },
    { key: 'location', req: 'no', maps: 'location text' },
    { key: 'description', req: 'no', maps: 'long description' },
  ];

  readonly providerRows = [
    { name: 'provideScheduler(...providers)', kind: 'EnvironmentProviders', purpose: 'Root setup. Defaults to the Native adapter; pass an adapter/feature provider to override.' },
    { name: 'provideNativeDateAdapter({ locale? })', kind: 'Provider[]', purpose: 'Zero-dep Intl-based date layer (the default).' },
    { name: 'provideSchedulerI18n(messages)', kind: 'Provider', purpose: 'Override UI strings (merged over defaults).' },
    { name: 'SCHEDULER_DATE_ADAPTER', kind: 'InjectionToken', purpose: 'Holds the active DateAdapter instance.' },
    { name: 'SCHEDULER_LOCALE', kind: 'InjectionToken', purpose: 'Active locale string (e.g. "en-US").' },
    { name: 'SCHEDULER_MESSAGES', kind: 'InjectionToken', purpose: 'Active SchedulerMessages bundle.' },
    { name: 'DEFAULT_SCHEDULER_MESSAGES', kind: 'const', purpose: 'The built-in English message defaults.' },
  ];

  readonly adapterRows = [
    { sig: 'today() / now()', ret: 'D', desc: 'Start-of-today / current instant.' },
    { sig: 'clone(d)', ret: 'D', desc: 'Copy a date.' },
    { sig: 'fromNative(d) / toNative(d)', ret: 'D / Date', desc: 'Convert to/from a JS Date.' },
    { sig: 'isValid(d)', ret: 'boolean', desc: 'Validity check.' },
    { sig: 'addMinutes/addDays/addMonths/addYears(d, n)', ret: 'D', desc: 'Arithmetic.' },
    { sig: 'startOfDay/Week/Month/Year(d, …)', ret: 'D', desc: 'Period boundaries (week takes firstDayOfWeek).' },
    { sig: 'getYear/getMonth/getDate(d)', ret: 'number', desc: 'Calendar parts.' },
    { sig: 'getDayOfWeek/getHours/getMinutes(d)', ret: 'number', desc: 'Time parts (0=Sun).' },
    { sig: 'getWeekNumber(d, firstDayOfWeek)', ret: 'number', desc: 'ISO-ish week number.' },
    { sig: 'setTime(d, h, m)', ret: 'D', desc: 'Set hours/minutes.' },
    { sig: 'compare(a, b)', ret: 'number', desc: 'Sort comparator (<0/0/>0).' },
    { sig: 'isSameDay(a, b)', ret: 'boolean', desc: 'Same calendar day.' },
    { sig: 'diffMinutes/diffDays(a, b)', ret: 'number', desc: 'Signed difference.' },
    { sig: 'format(d, pattern, locale?)', ret: 'string', desc: 'Format via pattern.' },
    { sig: 'parse(value, pattern?)', ret: 'D', desc: 'Parse input to a date.' },
    { sig: 'getDayNames/getMonthNames(style, locale?)', ret: 'string[]', desc: 'Localized names (long/short/narrow).' },
  ];

  readonly modelRows = [
    { name: 'SchedulerViewType', shape: "'day'|'week'|'workWeek'|'month'|'year'|'agenda'|'monthAgenda'|'timelineDay'|'timelineWeek'|'timelineWorkWeek'|'timelineMonth'|'timelineYear'" },
    { name: 'LayoutEngine', shape: "'verticalTime'|'horizontalTime'|'calendar'" },
    { name: 'TimeScaleConfig', shape: '{ enabled: boolean; slotCount: number }' },
    { name: 'HeaderRowUnit', shape: "'year'|'month'|'week'|'date'|'hour'" },
    { name: 'HeaderRow', shape: '{ unit: HeaderRowUnit; format?: string }' },
    { name: 'GroupingConfig', shape: '{ resources: string[]; byDate?: boolean; allowGroupEdit?: boolean }' },
    { name: 'ViewDescriptor', shape: 'typed view config — see View options' },
    { name: 'FieldMap', shape: 'record→event field mapping — see FieldMap' },
    { name: 'SchedulerEvent<D>', shape: 'canonical normalized event — see Payload types' },
    { name: 'ResourceDefinition', shape: 'resource set — see Resources' },
    { name: 'SchedulerChange<D>', shape: '{ event; scope? } — CRUD payload' },
    { name: 'NavigateEvent<D>', shape: '{ date; view; action }' },
    { name: 'SchedulerMessages', shape: 'navigation/today/previous/next/viewSwitcher/close/edit/delete/allDay/moreEvents(n)/showLess/noRenderer(v)' },
    { name: 'QuickViewContext<D>', shape: '{ $implicit: event; close(); edit(); delete() }' },
  ];

  readonly engineRows = [
    { fn: 'layoutVerticalTime(...)', ret: 'VerticalTimeLayout', used: 'Day / Week / WorkWeek' },
    { fn: 'layoutMonth(...)', ret: 'MonthLayout', used: 'Month' },
    { fn: 'layoutList(...)', ret: 'ListLayout', used: 'Agenda / Month-Agenda' },
    { fn: 'layoutYear(...)', ret: 'YearLayout', used: 'Year' },
    { fn: 'layoutHorizontalTime(...)', ret: 'HorizontalTimeLayout', used: 'all Timeline views' },
  ];

  readonly gestureRows = [
    { name: 'GestureMode', sig: "type 'move'|'resize-start'|'resize-end'", desc: 'Active drag kind.' },
    { name: 'DRAG_THRESHOLD_PX', sig: 'const number', desc: 'Pixels before a drag starts (4).' },
    { name: 'clamp(v, min, max)', sig: '(n,n,n) => number', desc: 'Bound a value.' },
    { name: 'crossedDragThreshold(dx, dy)', sig: '(n,n) => boolean', desc: 'Past the 4px threshold.' },
    { name: 'snapMinutesFromDeltaY(...)', sig: '=> number', desc: 'Vertical drag → snapped minutes.' },
    { name: 'columnFromDeltaX(...)', sig: '=> number', desc: 'Horizontal drag → column index.' },
    { name: 'cellIndexFromOffset(...)', sig: '=> number', desc: 'Pointer offset → cell index.' },
  ];

  readonly exportIndex = [
    { cat: 'Component', list: 'SchedulerComponent (dl-scheduler)' },
    { cat: 'Providers', list: 'provideScheduler, provideNativeDateAdapter, provideSchedulerI18n' },
    { cat: 'Tokens', list: 'SCHEDULER_DATE_ADAPTER, SCHEDULER_LOCALE, SCHEDULER_MESSAGES, DEFAULT_SCHEDULER_MESSAGES' },
    { cat: 'View factories', list: 'dayView, weekView, workWeekView, monthView, yearView, agendaView, monthAgendaView, timelineDay/Week/WorkWeek/Month/YearView, engineFor' },
    { cat: 'Adapters', list: 'DateAdapter (abstract), NativeDateAdapter' },
    { cat: 'Templates', list: 'QuickViewTemplateDirective (ngsQuickViewTemplate), QuickViewContext' },
    { cat: 'i18n', list: 'SchedulerMessages' },
    { cat: 'Models', list: 'ViewDescriptor, FieldMap, SchedulerEvent, ResourceDefinition, SchedulerChange, NavigateEvent, GroupingConfig, TimeScaleConfig, HeaderRow, HeaderRowUnit, LayoutEngine, SchedulerViewType' },
    { cat: 'Engine (advanced)', list: 'layoutVerticalTime, layoutMonth, layoutList, layoutYear, layoutHorizontalTime, buildTimelineColumns, buildTimelineRows, normalizeEvents, sortEvents, countEventsOn, parseHour + their result interfaces' },
    { cat: 'Interaction (advanced)', list: 'GestureMode, DRAG_THRESHOLD_PX, clamp, crossedDragThreshold, snapMinutesFromDeltaY, columnFromDeltaX, cellIndexFromOffset' },
    { cat: 'Renderer components', list: 'VerticalTime/Month/Agenda/Year/MonthAgenda/TimelineViewComponent, QuickViewComponent (used internally by the shell)' },
  ];

  readonly resourceRows = [
    { name: 'field', type: 'string', purpose: 'record field holding this resource id' },
    { name: 'name', type: 'string', purpose: 'logical name referenced by grouping' },
    { name: 'title', type: 'string', purpose: 'human label for the resource set' },
    { name: 'dataSource', type: 'ReadonlyArray<Record>', purpose: 'the resource items' },
    { name: 'idField', type: 'string', purpose: 'item field used as id' },
    { name: 'textField', type: 'string', purpose: 'item field used as label' },
    { name: 'colorField', type: 'string?', purpose: 'item field used as color' },
    { name: 'allowMultiple', type: 'boolean?', purpose: 'event may belong to many items' },
  ];

  readonly s = {
    install: `npm install @datelane/core`,

    peers: `"peerDependencies": {
  "@angular/core": ">=18.0.0 <23.0.0",
  "@angular/common": ">=18.0.0 <23.0.0"
}
// luxon / moment are OPTIONAL peers (only for those adapters)`,

    styleImport: `/* styles.scss (or angular.json "styles") */
@import '@datelane/core/styles/scheduler.css';`,

    bootstrap: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideScheduler()], // Native adapter by default
});`,

    quickComponent: `import { Component } from '@angular/core';
import {
  SchedulerComponent, weekView, monthView, dayView,
  type FieldMap, type SchedulerViewType,
} from '@datelane/core';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [SchedulerComponent],
  template: \`
    <dl-scheduler
      [(activeView)]="view"
      [views]="views"
      [events]="events"
      [fieldMap]="fieldMap"
      height="600px"
      (eventClick)="onClick($event)">
    </dl-scheduler>
  \`,
})
export class AppComponent {
  view: SchedulerViewType = 'week';
  views = [dayView(), weekView({ isDefault: true }), monthView()];

  fieldMap: FieldMap = {
    id: 'id', subject: 'title', start: 'from', end: 'to',
  };
  events = [
    { id: 1, title: 'Standup', from: new Date(), to: new Date() },
  ];

  onClick(c: any) { console.log('clicked', c.event.subject); }
}`,

    views: `import { dayView, weekView, monthView, timelineYearView } from '@datelane/core';

views = [
  dayView({ interval: 3, displayName: '3 Days', startHour: '08:00', endHour: '20:00' }),
  weekView({ isDefault: true, firstDayOfWeek: 1, showWeekNumber: true }),
  monthView({ readonly: true }),
  timelineYearView({ orientation: 'vertical' }),
];`,

    twoway: `<dl-scheduler
  [(activeView)]="view"     <!-- 'week' | 'month' | ... -->
  [(viewDate)]="date"       <!-- adapter date; jump anywhere -->
  ...>
</dl-scheduler>`,

    outputs: `onChange(c: SchedulerChange) {
  // controlled: apply the proposed start/end to YOUR data
  this.events = this.events.map(e =>
    e.id === c.event.id ? { ...e, from: c.event.start, to: c.event.end } : e);
}
onDelete(c: SchedulerChange) {
  this.events = this.events.filter(e => e.id !== c.event.id);
}
onCell(p: { date: unknown; resourceId?: string | number }) {
  this.openCreateForm(p.date);   // host owns create
}
onEdit(c: SchedulerChange) {
  this.openEditForm(c.event);    // host owns edit
}`,

    fieldmap: `fieldMap: FieldMap = {
  id: 'Id',
  subject: 'Subject',
  start: 'StartTime',
  end: 'EndTime',
  isAllDay: 'IsAllDay',
  recurrenceRule: 'RecurrenceRule',
  resource: 'OwnerId',
  color: 'Color',
};`,

    resources: `resources: ResourceDefinition[] = [{
  field: 'ownerId', name: 'owners', title: 'Owner',
  idField: 'id', textField: 'text', colorField: 'color',
  dataSource: [
    { id: 1, text: 'Alex',  color: '#2563eb' },
    { id: 2, text: 'Priya', color: '#16a34a' },
  ],
}];

// in the template:
// [resources]="resources" [grouping]="{ resources: ['owners'] }"`,

    types: `interface SchedulerChange<D = unknown> {
  event: SchedulerEvent<D>;
  scope?: 'occurrence' | 'following' | 'series';
}

interface SchedulerEvent<D = unknown> {
  id: string | number;
  subject: string;
  start: D;            // adapter date
  end: D;
  isAllDay: boolean;
  recurrenceRule?: string;
  resourceIds?: Array<string | number>;
  color?: string;
  raw: Record<string, unknown>;  // your original record
}

interface NavigateEvent<D = unknown> {
  date: D;
  view: SchedulerViewType;
  action: 'prev' | 'next' | 'today' | 'date';
}`,

    templates: `<dl-scheduler ...>
  <ng-template ngsQuickViewTemplate let-event let-close="close" let-edit="edit">
    <strong>{{ event.subject }}</strong>
    <button (click)="edit()">Edit</button>
    <button (click)="close()">Close</button>
  </ng-template>
</dl-scheduler>`,

    i18n: `import { provideScheduler, provideSchedulerI18n } from '@datelane/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideScheduler(),
    provideSchedulerI18n({
      today: 'Aujourd\\u2019hui',
      previous: 'Précédent',
      next: 'Suivant',
      moreEvents: (n) => \`+\${n} de plus\`,
    }),
  ],
});`,

    theming: `.dl-scheduler {
  --dl-accent: #2563eb;        /* recolors selection, today, focus, events */
  --dl-radius-md: 10px;
  --dl-font-sans: 'Söhne', system-ui, sans-serif;
  --dl-slot-h: 48px;           /* time-slot height / density */
}`,

    dark: `<!-- toggle the built-in dark token mapping -->
<dl-scheduler data-dl-theme="dark" ...></dl-scheduler>`,

    providers: `import {
  provideScheduler, provideNativeDateAdapter, provideSchedulerI18n,
} from '@datelane/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideScheduler(
      provideNativeDateAdapter({ locale: 'en-GB' }),
    ),
    provideSchedulerI18n({ today: 'Now' }),
  ],
});`,

    customAdapter: `import { DateAdapter } from '@datelane/core';

// Implement every abstract method for your own date library.
export class MyDateAdapter extends DateAdapter<MyDate> {
  today() { /* … */ }
  addDays(d: MyDate, n: number) { /* … */ }
  format(d: MyDate, pattern: string, locale?: string) { /* … */ }
  // …and the rest of the contract (see table above)
}

// then provide it:
provideScheduler({ provide: SCHEDULER_DATE_ADAPTER, useClass: MyDateAdapter });`,

    adapters: `import { provideScheduler } from '@datelane/core';
import { provideLuxonDateAdapter } from '@datelane/core/luxon-adapter';
// import { provideMomentDateAdapter } from '@datelane/core/moment-adapter';

bootstrapApplication(AppComponent, {
  providers: [
    provideScheduler(
      provideLuxonDateAdapter({ locale: 'en-US' }),
    ),
  ],
});`,
  };
}
