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

module.exports = {
    createCanvas: () => new MockCanvas(),
    loadImage: async () => ({
        width: 100,
        height: 100
    })
};
