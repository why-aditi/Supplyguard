/**
 * Shared Tailwind class fragments for mission-control UI (no globals.css component classes).
 */

export const glassPanel =
  'bg-slate-900/45 backdrop-blur-xl border border-cyan-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.37)]';

export const glassPanelBright =
  'bg-white/[0.03] backdrop-blur-md border border-white/10';

export const glassInteractive =
  'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.05] hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]';

export const missionControl =
  'flex h-[100dvh] w-screen max-w-[100vw] flex-col gap-4 overflow-x-hidden overflow-y-hidden bg-slate-950 p-4 sm:gap-5 sm:p-5 lg:p-6';

export const mcRowTop =
  'mx-auto flex w-full max-w-[1540px] shrink-0 flex-col gap-4';

export const mcRowCenter =
  'mx-auto flex min-h-0 w-full max-w-[1540px] flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-5';

export const mcSidebarSlot =
  'h-auto max-h-[min(40vh,320px)] w-full min-h-0 shrink-0 lg:h-full lg:max-h-none lg:w-[280px]';

export const mcMapViewport =
  'relative min-h-[280px] flex-1 overflow-hidden rounded-2xl lg:min-h-0';

export const mapInnerContainer =
  'relative h-full w-full bg-[radial-gradient(ellipse_at_center,#0f172a_0%,#020617_100%)]';

export const mapOverlayVignette =
  'pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]';

/** Header bar: stacks below xl, grid at xl+ */
export const floatingHeaderWithMetrics = [
  'grid w-full items-center gap-3 rounded-2xl px-4 py-4 sm:px-8',
  'grid-cols-1 justify-items-stretch xl:grid-cols-[minmax(140px,max-content)_minmax(0,1fr)_auto] xl:gap-x-5 xl:gap-y-3',
  glassPanel,
].join(' ');

export const headerActionsShrink =
  'flex shrink-0 flex-wrap items-center justify-end gap-3 max-xl:justify-self-end';

/** Still scrollable; scrollbar track hidden (Firefox / WebKit / legacy Edge). */
export const scrollableScrollbarHidden =
  'overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export const modalOverlay =
  'fixed inset-0 z-[1000] flex animate-[modal-fade-in_0.3s_cubic-bezier(0.4,0,0.2,1)] items-center justify-center bg-black/82 p-3 backdrop-blur-md sm:p-5';

export const modalContent = [
  'relative max-h-[90vh] w-full max-w-[min(600px,100%)] rounded-2xl p-4',
  scrollableScrollbarHidden,
  'animate-[modal-slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)] border border-cyan-400/40 bg-slate-900/65',
  'shadow-[0_0_80px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.35)] backdrop-blur-[40px]',
  'sm:px-7 sm:py-8 lg:p-10',
  glassPanel,
].join(' ');

export const modalCloseBtn =
  'absolute right-5 top-5 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-white/10 bg-white/5 text-lg text-slate-400 transition-all duration-150 hover:rotate-90 hover:border-rose-500 hover:bg-rose-500/15 hover:text-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.35)]';

export const btnSimulateTrigger =
  'flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.12em] text-amber-500 transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-500/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:translate-y-0';

/** Settings / node detail shell */
export const dashboardRoot = 'flex min-h-[100dvh] flex-col overflow-x-hidden bg-slate-950 text-slate-50';

export const dashboardHeader =
  'shrink-0 border-b border-white/10 bg-slate-900/50 px-6 py-4 backdrop-blur-xl';

export const dashboardContent = 'flex min-h-0 flex-1 overflow-hidden';

export const dashboardMain =
  'min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:hover:bg-slate-600';

export const nodeDetailPage =
  'h-full overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700';

export const backLink =
  'mb-4 inline-flex items-center gap-1.5 text-sm text-cyan-400 transition-opacity hover:opacity-80';
