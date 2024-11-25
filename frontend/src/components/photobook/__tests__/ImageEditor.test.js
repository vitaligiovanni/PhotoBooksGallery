import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageEditor from '../ImageEditor';

describe('ImageEditor', () => {
    const mockImage = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('отображает все элементы управления редактированием', () => {
        render(
            <ImageEditor
                open={true}
                image={mockImage}
                onSave={mockOnSave}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('Редактировать изображение')).toBeInTheDocument();
        expect(screen.getByText('Яркость')).toBeInTheDocument();
        expect(screen.getByText('Контраст')).toBeInTheDocument();
    });

    it('вызывает onClose при нажатии кнопки Отмена', () => {
        render(
            <ImageEditor
                open={true}
                image={mockImage}
                onSave={mockOnSave}
                onClose={mockOnClose}
            />
        );

        fireEvent.click(screen.getByText('Отмена'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('применяет фильтры при их выборе', async () => {
        render(
            <ImageEditor
                open={true}
                image={mockImage}
                onSave={mockOnSave}
                onClose={mockOnClose}
            />
        );

        const filterButtons = screen.getAllByRole('button');
        fireEvent.click(filterButtons[1]); // Выбираем второй фильтр

        await waitFor(() => {
            const canvas = document.querySelector('canvas');
            expect(canvas).toHaveStyle({ filter: expect.stringContaining('grayscale') });
        });
    });
});
