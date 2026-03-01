import "@testing-library/jest-dom/vitest";

// Enable React's act environment for jsdom tests to suppress environment warnings.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
