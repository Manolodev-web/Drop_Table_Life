import { useState, useRef, useEffect } from 'preact/hooks';

export default function Window({
  appId,
  title,
  isActive,
  zIndex,
  onClose,
  onFocus,
  onMinimize,
  defaultSize,
  children,
}) {
  const seed = appId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const [pos, setPos] = useState({ x: 48 + (seed % 96), y: 44 + (seed % 52) });
  const [size] = useState(defaultSize || { w: 640, h: 460 });
  const [maximized, setMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const handleTitleMouseDown = (e) => {
    if (e.target.closest('.window-controls')) return;
    onFocus?.();
    if (maximized) return;
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const nextX = e.clientX - dragOffset.current.x;
      const nextY = Math.max(32, e.clientY - dragOffset.current.y);
      setPos({ x: nextX, y: nextY });
    };
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isDragging]);

  const style = maximized
    ? { left: 14, right: 14, top: 36, bottom: 82, width: 'auto', height: 'auto', zIndex }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex };

  return (
    <div
      ref={windowRef}
      onMouseDown={() => onFocus?.()}
      class={`window-enter absolute max-w-[95vw] max-h-[86vh] flex flex-col overflow-hidden rounded-[14px] backdrop-blur-2xl bg-[#111520]/88 transition-shadow duration-150 ${
        isActive
          ? 'border border-white/[0.16] ring-1 ring-inset ring-white/[0.06] shadow-[0_26px_70px_-14px_rgba(0,0,0,0.82),0_0_0_1px_rgba(0,0,0,0.45)]'
          : 'border border-white/[0.09] shadow-[0_14px_38px_-10px_rgba(0,0,0,0.6)] opacity-[0.96]'
      }`}
      style={style}
    >
      {/* Barra de título macOS */}
      <div
        onMouseDown={handleTitleMouseDown}
        onDblClick={() => setMaximized((m) => !m)}
        class={`relative h-9 flex items-center justify-between px-3.5 cursor-default select-none shrink-0 border-b transition-colors ${
          isActive
            ? 'bg-gradient-to-b from-white/[0.07] to-white/[0.02] border-white/[0.09]'
            : 'bg-white/[0.02] border-white/[0.06]'
        }`}
      >
        {/* Semáforos macOS precisos */}
        <div class="group/tl flex items-center gap-2 window-controls z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            class={`w-3 h-3 rounded-full flex items-center justify-center border transition-colors ${
              isActive
                ? 'bg-[#ff5f57] border-[#e0443e]/70 hover:bg-[#ff6e66]'
                : 'bg-white/15 border-white/10 group-hover/tl:bg-[#ff5f57] group-hover/tl:border-[#e0443e]/70'
            }`}
            title="Cerrar"
            aria-label="Cerrar ventana"
          >
            <svg class="traffic-glyph w-2 h-2 text-[#4d0000]" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            class={`w-3 h-3 rounded-full flex items-center justify-center border transition-colors ${
              isActive
                ? 'bg-[#febc2e] border-[#d89e24]/70 hover:bg-[#ffc646]'
                : 'bg-white/15 border-white/10 group-hover/tl:bg-[#febc2e] group-hover/tl:border-[#d89e24]/70'
            }`}
            title="Minimizar"
            aria-label="Minimizar ventana"
          >
            <svg class="traffic-glyph w-2 h-2 text-[#5c3c00]" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M2 5h6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMaximized((m) => !m);
            }}
            class={`w-3 h-3 rounded-full flex items-center justify-center border transition-colors ${
              isActive
                ? 'bg-[#28c840] border-[#1aab29]/70 hover:bg-[#34d64c]'
                : 'bg-white/15 border-white/10 group-hover/tl:bg-[#28c840] group-hover/tl:border-[#1aab29]/70'
            }`}
            title={maximized ? 'Restaurar' : 'Maximizar'}
            aria-label={maximized ? 'Restaurar ventana' : 'Maximizar ventana'}
          >
            <svg class="traffic-glyph w-2 h-2 text-[#004d0f]" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              {maximized ? (
                <path d="M3 7l4-4M4.5 7H3V5.5M5.5 3H7v1.5" />
              ) : (
                <path d="M2.5 5h5M5 2.5v5" />
              )}
            </svg>
          </button>
        </div>

        {/* Título centrado */}
        <span
          class={`text-[12.5px] font-medium tracking-[-0.01em] absolute left-1/2 -translate-x-1/2 pointer-events-none truncate max-w-[60%] ${
            isActive ? 'text-slate-200' : 'text-slate-400'
          }`}
        >
          {title}
        </span>

        <div class="w-14" />
      </div>

      {/* Contenido */}
      <div class="flex-1 overflow-auto bg-[#0b0e16]/55">
        {children}
      </div>
    </div>
  );
}
