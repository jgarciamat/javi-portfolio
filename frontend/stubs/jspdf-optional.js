// jsPDF's optional helpers (html2canvas for .html(), canvg for SVG images, DOMPurify) are never
// used by the app, which only writes text and tables: vite.config.ts points them here so their
// ~380 KB stay out of the build. Calling .html() or adding an SVG would now fail.
export default undefined;
