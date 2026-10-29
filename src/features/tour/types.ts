// ---------------------------------------------------------------------------
// In-app tutorial: the shape of a tour. One file per tour in ./tours/
// (`export default { ... } satisfies Tour`); registry.ts picks them all up.
// Targets are plain `data-tour="<id>"` attributes on the element to point at.
// ---------------------------------------------------------------------------

export type TourPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  /** Unique inside its tour, kebab-case. */
  id: string;
  /** Value of a data-tour="..." attribute; omit for a centred card. */
  target?: string;
  /** 1-4 words, sentence case. */
  title: string;
  /**
   * 1-2 short sentences (<= 32 words). {Tap} / {tap} become Tap/tap on touch
   * screens and Click/click with a mouse.
   */
  body: string;
  /** Optional one-line "Tip:" hint (<= 16 words), also {Tap}-aware. */
  tip?: string;
  /** Where the card sits beside the target on wide screens. Default 'auto'. */
  placement?: TourPlacement;
  /**
   * Show an enlarged live copy of the target in the card. Default: automatic
   * for small targets (<= 200x72 CSS px); never for canvas/svg charts.
   */
  magnify?: boolean;
  /**
   * Target absent or hidden after waiting: skip the step (default), or show
   * it as a centred card (for controls that only appear later).
   */
  ifMissing?: 'skip' | 'center';
  /** The target lives in the nav drawer: open the drawer first below lg. */
  menu?: 'open';
}

export interface Tour {
  /** 'welcome' or the page id. */
  id: string;
  /** Help page heading, e.g. 'Repertory'. */
  title: string;
  /** One plain sentence about the page (Help page). */
  summary: string;
  /**
   * A path that shows the page, for Help → "Show me". Omit when the page needs
   * data the user may not have (e.g. one patient).
   */
  route?: string;
  /** Help page hint in place of "Show me" when there is no route, e.g. how to reach the page. */
  howToOpen?: string;
  /** Help page order: welcome 0, then pages in menu order (10, 20, 30, …). */
  order: number;
  /** Bump to show a changed tour again to people who already saw it. */
  version: number;
  steps: TourStep[];
}
