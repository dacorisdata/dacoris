// Page size configuration for manuscript editor
// All dimensions are in pixels at 96 DPI (standard web DPI)

const PAGE_SIZES = {
  A4: {
    name: 'A4',
    width: 794,  // 210mm at 96 DPI
    height: 1123, // 297mm at 96 DPI
    marginTop: 96,    // 1 inch = 2.54cm
    marginRight: 96,
    marginBottom: 96,
    marginLeft: 96,
  },
  LETTER: {
    name: 'Letter',
    width: 816,  // 8.5 inches at 96 DPI
    height: 1056, // 11 inches at 96 DPI
    marginTop: 96,
    marginRight: 96,
    marginBottom: 96,
    marginLeft: 96,
  },
  LEGAL: {
    name: 'Legal',
    width: 816,  // 8.5 inches at 96 DPI
    height: 1344, // 14 inches at 96 DPI
    marginTop: 96,
    marginRight: 96,
    marginBottom: 96,
    marginLeft: 96,
  },
};

// Calculate content area (page size minus margins)
export const getContentDimensions = (pageSize) => {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  return {
    width: size.width - size.marginLeft - size.marginRight,
    height: size.height - size.marginTop - size.marginBottom,
  };
};

// Get full page dimensions including margins
export const getPageDimensions = (pageSize) => {
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  return {
    width: size.width,
    height: size.height,
    marginTop: size.marginTop,
    marginRight: size.marginRight,
    marginBottom: size.marginBottom,
    marginLeft: size.marginLeft,
  };
};

// Calculate how many pages are needed for given content height
export const calculatePageCount = (contentHeight, pageSize) => {
  const dimensions = getContentDimensions(pageSize);
  return Math.ceil(contentHeight / dimensions.height);
};

// Get page number for a given vertical position
export const getPageAtPosition = (yPosition, pageSize) => {
  const dimensions = getContentDimensions(pageSize);
  return Math.floor(yPosition / dimensions.height) + 1;
};

export const PAGE_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'LETTER', label: 'Letter (8.5 × 11 in)' },
  { value: 'LEGAL', label: 'Legal (8.5 × 14 in)' },
];

export const DEFAULT_PAGE_SIZE = 'A4';

export default PAGE_SIZES;
