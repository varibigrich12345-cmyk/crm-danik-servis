import '@testing-library/jest-dom'

// Глобальные моки для тестов
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

