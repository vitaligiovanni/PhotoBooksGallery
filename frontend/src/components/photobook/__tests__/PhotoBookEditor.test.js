import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhotoBookEditor from '../PhotoBookEditor';
import { usePhotoBook } from '../../../hooks/usePhotoBook';

// Мокаем хук usePhotoBook
jest.mock('../../../hooks/usePhotoBook', () => ({
    usePhotoBook: jest.fn(),
}));

describe('PhotoBookEditor', () => {
    const mockBook = {
        id: '1',
        title: 'Тестовая книга',
    };

    const mockPages = [
        { id: '1', content: 'Страница 1' },
        { id: '2', content: 'Страница 2' },
    ];

    beforeEach(() => {
        usePhotoBook.mockImplementation(() => ({
            book: mockBook,
            pages: mockPages,
            currentPage: mockPages[0],
            loading: false,
            error: null,
            setCurrentPage: jest.fn(),
            updatePage: jest.fn(),
            savePage: jest.fn(),
            addPage: jest.fn(),
            deletePage: jest.fn(),
        }));
    });

    it('отображает панель инструментов', () => {
        render(<PhotoBookEditor photoBookId="1" />);
        expect(screen.getByRole('button', { name: /добавить страницу/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /удалить страницу/i })).toBeInTheDocument();
    });

    it('отображает текущую страницу', () => {
        render(<PhotoBookEditor photoBookId="1" />);
        expect(screen.getByText('Страница 1')).toBeInTheDocument();
    });

    it('автоматически сохраняет изменения', async () => {
        jest.useFakeTimers();
        const mockSavePage = jest.fn();
        usePhotoBook.mockImplementation(() => ({
            ...usePhotoBook(),
            savePage: mockSavePage,
        }));

        render(<PhotoBookEditor photoBookId="1" />);
        
        // Имитируем изменение страницы
        act(() => {
            fireEvent.change(screen.getByTestId('page-content'), {
                target: { value: 'Новый контент' },
            });
        });

        // Ждем 2 секунды (время автосохранения)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(mockSavePage).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it('показывает индикатор загрузки при сохранении', () => {
        usePhotoBook.mockImplementation(() => ({
            ...usePhotoBook(),
            loading: true,
        }));

        render(<PhotoBookEditor photoBookId="1" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('отображает ошибку при неудачном сохранении', () => {
        usePhotoBook.mockImplementation(() => ({
            ...usePhotoBook(),
            error: 'Ошибка сохранения',
        }));

        render(<PhotoBookEditor photoBookId="1" />);
        expect(screen.getByText('Ошибка сохранения')).toBeInTheDocument();
    });
});
