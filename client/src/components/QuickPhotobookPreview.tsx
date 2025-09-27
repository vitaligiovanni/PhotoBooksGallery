import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateQuickPreview } from '@/lib/photobookUtils';
import type { PhotobookSpread } from '@/types';

interface QuickPhotobookPreviewProps {
	photos?: File[];
}

export default function QuickPhotobookPreview({ photos }: QuickPhotobookPreviewProps) {
	const [spreads, setSpreads] = useState<PhotobookSpread[]>([]);
	const [index, setIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const genId = useRef(0);

	useEffect(() => {
		const run = async () => {
			if (!photos || photos.length === 0) {
				setSpreads([]);
				setIndex(0);
				return;
			}
			setLoading(true);
			const id = ++genId.current;
			try {
				const preview = await generateQuickPreview(photos);
				if (genId.current !== id) return; // guard against race
				setSpreads(preview.previewSpreads);
				setIndex(0);
			} finally {
				if (genId.current === id) setLoading(false);
			}
		};
		run();
	}, [photos]);

	const prev = () => setIndex(i => (i > 0 ? i - 1 : i));
	const next = () => setIndex(i => (i < spreads.length - 1 ? i + 1 : i));

	if (loading) return <div className="p-4">Генерируем превью…</div>;
	if (!spreads.length) return null; // ничего не показываем до загрузки фото

	const current = spreads[index];

	const renderPage = (side: 'left' | 'right') => {
		const page = side === 'left' ? current.leftPage : current.rightPage;
		return (
			<div className="relative aspect-square border bg-gray-50 overflow-hidden">
				{page.elements.map((el: any, i: number) => {
					const zoneStyle: React.CSSProperties = {
						position: 'absolute',
						left: `${el.position.x}%`,
						top: `${el.position.y}%`,
						width: `${el.size.width}%`,
						height: `${el.size.height}%`,
						overflow: 'hidden',
						backgroundColor: '#e5e7eb', // fallback bg while image loads
						borderRadius: '4px',
					};
					if (el.type === 'photo' && el.photoUrl) {
						// Упрощенный подход: изображение заполняет всю фотозону с объект-fit: cover
						const imgStyle: React.CSSProperties = {
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							objectPosition: 'center',
							userSelect: 'none',
							pointerEvents: 'none',
							display: 'block',
							borderRadius: '4px',
						};
						return (
							<div key={i} style={zoneStyle}>
								<img 
									src={el.photoUrl} 
									alt="" 
									draggable={false} 
									style={imgStyle}
									onLoad={(e) => {
										// Убеждаемся, что изображение полностью загружено
										const img = e.target as HTMLImageElement;
										if (img.style.opacity !== '1') {
											img.style.opacity = '1';
										}
									}}
								/>
							</div>
						);
					}
					// non-photo elements or missing url — keep as placeholder box
					return <div key={i} style={zoneStyle} />;
				})}
			</div>
		);
	};

	return (
		<div className="w-full p-4">
			<div className="flex items-center justify-between mb-2">
				<Button variant="outline" onClick={prev} disabled={index === 0}>◀</Button>
				<div>Разворот {index + 1} из {spreads.length}</div>
				<Button variant="outline" onClick={next} disabled={index === spreads.length - 1}>▶</Button>
			</div>
			<div className="grid grid-cols-2 gap-2 border rounded p-2 bg-white">
				{renderPage('left')}
				{renderPage('right')}
			</div>
		</div>
	);
}

