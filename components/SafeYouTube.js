"use client";

// Locked-down YouTube embed — prevents click-outs to YouTube.
// Params kill the video title overlay, related videos, annotations, and
// the YouTube logo link. The sandbox attr disallows popups & top-level
// navigation, so even if the player tries to open YouTube, the iframe
// can't escape its own frame.
export default function SafeYouTube({ videoId, onClose, autoplay = true }) {
  const params = [
    'modestbranding=1',
    'rel=0',
    'showinfo=0',
    'iv_load_policy=3',
    'playsinline=1',
    autoplay ? 'autoplay=1' : '',
  ].filter(Boolean).join('&');

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;

  return (
    <div className="relative w-full aspect-video bg-black">
      <iframe
        src={src}
        className="w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allowFullScreen
      />
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/90 z-10"
          aria-label="Close video"
        >
          ✕
        </button>
      )}
    </div>
  );
}
