// An ORIGINAL monogram -- a shield around an open book, in the app's own
// navy/gold palette. This is deliberately NOT a copy of DELSU's actual
// institutional crest (which is trademarked) -- see the README for why.
// Drawn as inline SVG so it's crisp at any size and themeable via `color`.

export default function DelsuMonogram({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4 L42 11 V22 C42 33 34.5 41 24 44 C13.5 41 6 33 6 22 V11 Z"
        fill="#14336b"
      />
      <path
        d="M24 8 L38 13.4 V22 C38 31 32.2 37.4 24 40 C15.8 37.4 10 31 10 22 V13.4 Z"
        fill="#f4f6fb"
      />
      <path
        d="M24 16 C21.5 14.3 17.8 13.6 15 14.4 V27.4 C17.8 26.6 21.5 27.3 24 29"
        stroke="#14336b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 16 C26.5 14.3 30.2 13.6 33 14.4 V27.4 C30.2 26.6 26.5 27.3 24 29"
        stroke="#14336b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 16 V29" stroke="#14336b" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="34.5" r="1.6" fill="#f2a900" />
    </svg>
  );
}
