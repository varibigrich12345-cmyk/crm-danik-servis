import '@testing-library/jest-dom'

// Глобальные моки для тестов
// @ts-expect-error - глобальный объект window
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

