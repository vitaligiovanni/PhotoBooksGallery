import '@testing-library/jest-dom';

// Мок для URL.createObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Мок для canvas и связанных API
class MockCanvas {
    getContext() {
        return {
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({
                data: new Uint8ClampedArray(100),
                width: 10,
                height: 10
            })),
            putImageData: jest.fn(),
            createImageData: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            clearRect: jest.fn()
        };
    }
    toDataURL() {
        return 'data:image/png;base64,fake';
    }
}

global.HTMLCanvasElement.prototype.getContext = function() {
    return new MockCanvas().getContext();
};

global.HTMLCanvasElement.prototype.toDataURL = function() {
    return new MockCanvas().toDataURL();
};

// Мок для ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Мок для IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Мок для window.createImageBitmap
global.createImageBitmap = async () => ({});

// Мок для window.Image
global.Image = class Image {
    constructor() {
        setTimeout(() => {
            this.onload && this.onload();
        });
    }
}
