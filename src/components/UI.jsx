import { atom, useAtom } from "jotai";
import { useEffect } from "react";

export const pageAtom = atom(0);

// Create 8 pages for demonstration
export const pages = Array(8).fill(null).map((_, i) => ({
  pageNumber: i
}));

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);

  useEffect(() => {
    // Only play sound when page changes and not on initial render
    if (page !== 0) {
      try {
        const audio = new Audio("/audios/page-flip-01a.mp3");
        audio.play().catch(err => console.log("Audio play failed:", err));
      } catch (error) {
        console.log("Audio error:", error);
      }
    }
  }, [page]);

  return (
    <>
      <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
        <div className="w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
            {/* Cover button */}
            <button
              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                page === 0
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(0)}
            >
              Cover
            </button>
            
            {/* Page buttons */}
            {[...pages].slice(1).map((_, index) => (
              <button
                key={index + 1}
                className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                  index + 1 === page
                    ? "bg-white/90 text-black"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => setPage(index + 1)}
              >
                Page {index + 1}
              </button>
            ))}
            
            {/* Back cover button */}
            <button
              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back Cover
            </button>
          </div>
        </div>
      </main>
    </>
  );
};