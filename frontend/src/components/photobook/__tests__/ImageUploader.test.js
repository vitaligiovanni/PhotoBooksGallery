import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUploader from '../ImageUploader';

jest.mock('react-dropzone', () => ({
    useDropzone: () => ({
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false,
    }),
}));

describe('ImageUploader', () => {
    const mockOnImageSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('отображает зону загрузки', () => {
        render(<ImageUploader onImageSelect={mockOnImageSelect} />);
        expect(screen.getByText(/Перетащите изображения сюда/i)).toBeInTheDocument();
    });

    it('отображает список загруженных изображений', async () => {
        const { container } = render(<ImageUploader onImageSelect={mockOnImageSelect} />);
        
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const input = container.querySelector('input[type="file"]');
        
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText('test.jpg')).toBeInTheDocument();
        });
    });

    it('показывает ошибку при загрузке неверного формата', async () => {
        const { container } = render(<ImageUploader onImageSelect={mockOnImageSelect} />);
        
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        const input = container.querySelector('input[type="file"]');
        
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText(/неверный формат/i)).toBeInTheDocument();
        });
    });

    it('открывает меню редактирования при клике на кнопку', () => {
        render(<ImageUploader onImageSelect={mockOnImageSelect} />);
        const menuButton = screen.getByLabelText('меню');
        fireEvent.click(menuButton);
        
        expect(screen.getByText('Редактировать')).toBeInTheDocument();
        expect(screen.getByText('Удалить')).toBeInTheDocument();
    });
});
